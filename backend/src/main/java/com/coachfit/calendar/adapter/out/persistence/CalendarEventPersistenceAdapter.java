package com.coachfit.calendar.adapter.out.persistence;

import com.coachfit.calendar.application.port.out.AutoLinkActivityCandidate;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link CalendarEventPersistencePort}.
 *
 * <p>Simple reads use Spring Data JPA via {@link CalendarEventJpaRepository}.
 * Bulk / complex writes use {@link JdbcClient} for fine-grained SQL control.
 */
@Repository
class CalendarEventPersistenceAdapter implements CalendarEventPersistencePort {

    private final CalendarEventJpaRepository repo;
    private final JdbcClient                 jdbcClient;

    CalendarEventPersistenceAdapter(CalendarEventJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    // ── save ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID save(UUID userId, LocalDate date, String eventType,
                     UUID workoutId, String title, String description) {
        CalendarEventEntity entity = new CalendarEventEntity(userId, date, eventType, title);
        entity.workoutId   = workoutId;
        entity.description = description;
        return repo.save(entity).id;
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean update(UUID eventId, UUID userId, LocalDate date, String eventType,
                          String title, String description, UUID workoutId) {
        int rows = jdbcClient.sql("""
                UPDATE calendar_events
                   SET date        = :date,
                       event_type  = :eventType,
                       title       = :title,
                       description = :description,
                       workout_id  = :workoutId,
                       updated_at  = now()
                 WHERE id          = :id
                   AND user_id     = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",          eventId)
                .param("userId",      userId)
                .param("date",        date)
                .param("eventType",   eventType)
                .param("title",       title)
                .param("description", description)
                .param("workoutId",   workoutId)
                .update();
        return rows > 0;
    }

    // ── updateStatus ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean updateStatus(UUID eventId, UUID userId, String newStatus) {
        int rows = jdbcClient.sql("""
                UPDATE calendar_events
                   SET status     = :status,
                       updated_at = now()
                 WHERE id         = :id
                   AND user_id    = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",     eventId)
                .param("userId", userId)
                .param("status", newStatus)
                .update();
        return rows > 0;
    }

    // ── linkActivity ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void linkActivity(UUID eventId, UUID userId, UUID activityId, BigDecimal complianceScore) {
        // compliance_score >= 50 → completed, else partial
        String newStatus = (complianceScore != null
                && complianceScore.compareTo(BigDecimal.valueOf(50)) >= 0)
                ? "completed" : "partial";

        jdbcClient.sql("""
                UPDATE calendar_events
                   SET activity_id      = null,
                       compliance_score = null,
                       status           = 'planned',
                       updated_at       = now()
                 WHERE user_id          = :userId
                   AND activity_id      = :activityId
                   AND id              <> :id
                   AND workout_id IS NOT NULL
                   AND deleted_at IS NULL
                """)
                .param("id",         eventId)
                .param("userId",     userId)
                .param("activityId", activityId)
                .update();

        jdbcClient.sql("""
                UPDATE calendar_events
                   SET deleted_at = now(),
                       updated_at = now()
                 WHERE user_id     = :userId
                   AND activity_id = :activityId
                   AND id         <> :id
                   AND workout_id IS NULL
                   AND deleted_at IS NULL
                """)
                .param("id",         eventId)
                .param("userId",     userId)
                .param("activityId", activityId)
                .update();

        jdbcClient.sql("""
                UPDATE calendar_events
                   SET activity_id      = :activityId,
                       compliance_score = :complianceScore,
                       status           = :status,
                       updated_at       = now()
                 WHERE id       = :id
                   AND user_id  = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",              eventId)
                .param("userId",          userId)
                .param("activityId",      activityId)
                .param("complianceScore", complianceScore)
                .param("status",          newStatus)
                .update();
    }

    // ── unlinkActivity ────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void unlinkActivity(UUID eventId, UUID userId) {
        // userId is included for defense-in-depth: even if a bug leaks a wrong eventId,
        // this WHERE clause ensures we never touch another user's event.
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET activity_id      = null,
                       compliance_score = null,
                       status           = 'planned',
                       updated_at       = now()
                 WHERE id      = :id
                   AND user_id = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",     eventId)
                .param("userId", userId)
                .update();
    }

    // ── reorder ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void reorder(UUID userId, List<ReorderEntry> entries) {
        for (ReorderEntry entry : entries) {
            jdbcClient.sql("""
                    UPDATE calendar_events
                       SET order_index = :idx,
                           updated_at  = now()
                     WHERE id          = :id
                       AND user_id     = :userId
                       AND deleted_at IS NULL
                    """)
                    .param("idx",    entry.newOrderIndex())
                    .param("id",     entry.eventId())
                    .param("userId", userId)
                    .update();
        }
    }

    // ── softDelete ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void softDelete(UUID eventId) {
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET deleted_at = now(), updated_at = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", eventId)
                .update();
    }

    // ── findById ──────────────────────────────────────────────────────────────

    @Override
    public Optional<CalendarEventSummary> findById(UUID eventId) {
        return jdbcClient.sql("""
                SELECT c.id, c.user_id, c.date, c.event_type, c.workout_id, c.activity_id,
                       c.title, c.description, c.status, c.order_index, c.compliance_score,
                       w.sport AS workout_sport, w.estimated_duration_seconds AS workout_duration,
                       w.estimated_tss AS workout_tss, w.steps AS workout_steps,
                       a.tss AS activity_tss, a.duration_seconds AS activity_duration,
                       a.sport AS activity_sport, a.name AS activity_name,
                       a.distance_meters AS activity_distance, a.avg_heart_rate AS activity_avg_hr,
                       a.max_heart_rate AS activity_max_hr, a.avg_power AS activity_avg_power,
                       a.source AS activity_source
                  FROM calendar_events c
                  LEFT JOIN workouts w ON w.id = c.workout_id AND w.deleted_at IS NULL
                  LEFT JOIN activities a ON a.id = c.activity_id AND a.deleted_at IS NULL
                 WHERE c.id = :eventId
                   AND c.deleted_at IS NULL
                """)
                .param("eventId", eventId)
                .query((rs, rowNum) -> new CalendarEventSummary(
                        rs.getObject("id", UUID.class),
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("date", LocalDate.class),
                        rs.getString("event_type"),
                        rs.getObject("workout_id", UUID.class),
                        rs.getObject("activity_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getShort("order_index"),
                        rs.getBigDecimal("compliance_score"),
                        rs.getString("workout_sport"),
                        nullableInt(rs, "workout_duration"),
                        rs.getBigDecimal("workout_tss"),
                        rs.getString("workout_steps"),
                        rs.getBigDecimal("activity_tss"),
                        nullableInt(rs, "activity_duration"),
                        rs.getString("activity_sport"),
                        rs.getString("activity_name"),
                        rs.getBigDecimal("activity_distance"),
                        nullableInt(rs, "activity_avg_hr"),
                        nullableInt(rs, "activity_max_hr"),
                        nullableInt(rs, "activity_avg_power"),
                        rs.getString("activity_source")
                ))
                .optional();
    }

    // ── findByUserAndDateRange ────────────────────────────────────────────────

    @Override
    public List<CalendarEventSummary> findByUserAndDateRange(UUID userId, LocalDate from, LocalDate to) {
        return jdbcClient.sql("""
                SELECT c.id, c.user_id, c.date, c.event_type, c.workout_id, c.activity_id,
                       c.title, c.description, c.status, c.order_index, c.compliance_score,
                       w.sport AS workout_sport, w.estimated_duration_seconds AS workout_duration,
                       w.estimated_tss AS workout_tss, w.steps AS workout_steps,
                       a.tss AS activity_tss, a.duration_seconds AS activity_duration,
                       a.sport AS activity_sport, a.name AS activity_name,
                       a.distance_meters AS activity_distance, a.avg_heart_rate AS activity_avg_hr,
                       a.max_heart_rate AS activity_max_hr, a.avg_power AS activity_avg_power,
                       a.source AS activity_source
                  FROM calendar_events c
                  LEFT JOIN workouts w ON w.id = c.workout_id AND w.deleted_at IS NULL
                  LEFT JOIN activities a ON a.id = c.activity_id AND a.deleted_at IS NULL
                 WHERE c.user_id = :userId
                   AND c.date >= :from
                   AND c.date <= :to
                   AND c.deleted_at IS NULL
                 ORDER BY c.date ASC, c.order_index ASC
                """)
                .param("userId", userId)
                .param("from",   from)
                .param("to",     to)
                .query((rs, rowNum) -> new CalendarEventSummary(
                        rs.getObject("id", UUID.class),
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("date", LocalDate.class),
                        rs.getString("event_type"),
                        rs.getObject("workout_id", UUID.class),
                        rs.getObject("activity_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getShort("order_index"),
                        rs.getBigDecimal("compliance_score"),
                        rs.getString("workout_sport"),
                        nullableInt(rs, "workout_duration"),
                        rs.getBigDecimal("workout_tss"),
                        rs.getString("workout_steps"),
                        rs.getBigDecimal("activity_tss"),
                        nullableInt(rs, "activity_duration"),
                        rs.getString("activity_sport"),
                        rs.getString("activity_name"),
                        rs.getBigDecimal("activity_distance"),
                        nullableInt(rs, "activity_avg_hr"),
                        nullableInt(rs, "activity_max_hr"),
                        nullableInt(rs, "activity_avg_power"),
                        rs.getString("activity_source")
                ))
                .list();
    }

    @Override
    public List<CalendarEventSummary> findPlannedWorkoutsByDate(UUID userId, LocalDate date) {
        return jdbcClient.sql("""
                SELECT c.id, c.user_id, c.date, c.event_type, c.workout_id, c.activity_id,
                       c.title, c.description, c.status, c.order_index, c.compliance_score,
                       w.sport AS workout_sport, w.estimated_duration_seconds AS workout_duration,
                       w.estimated_tss AS workout_tss, w.steps AS workout_steps
                  FROM calendar_events c
                  JOIN workouts w ON w.id = c.workout_id AND w.deleted_at IS NULL
                 WHERE c.user_id = :userId
                   AND c.date = :date
                   AND c.event_type = 'workout'
                   AND c.status = 'planned'
                   AND c.deleted_at IS NULL
                 ORDER BY c.order_index ASC
                """)
                .param("userId", userId)
                .param("date",   date)
                .query((rs, rowNum) -> new CalendarEventSummary(
                        rs.getObject("id", UUID.class),
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("date", LocalDate.class),
                        rs.getString("event_type"),
                        rs.getObject("workout_id", UUID.class),
                        rs.getObject("activity_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getShort("order_index"),
                        rs.getBigDecimal("compliance_score"),
                        rs.getString("workout_sport"),
                        nullableInt(rs, "workout_duration"),
                        rs.getBigDecimal("workout_tss"),
                        rs.getString("workout_steps"),
                        null, null, null, null, null, null, null, null, null
                ))
                .list();
    }

    @Override
    public String findUserTimezone(UUID userId) {
        return jdbcClient.sql("""
                SELECT COALESCE(settings->>'timezone', 'Asia/Ho_Chi_Minh')
                  FROM users
                 WHERE id = :userId
                   AND deleted_at IS NULL
                """)
                .param("userId", userId)
                .query(String.class)
                .optional()
                .orElse("Asia/Ho_Chi_Minh");
    }

    // ── autoSkipPastPlanned ───────────────────────────────────────────────────

    @Override
    @Transactional
    public int autoSkipPastPlanned() {
        return jdbcClient.sql("""
                UPDATE calendar_events
                   SET status     = 'skipped',
                       updated_at = now()
                 WHERE status     = 'planned'
                   AND date       < CURRENT_DATE
                   AND deleted_at IS NULL
                """)
                .update();
    }

    @Override
    public Optional<SimpleActivityDetails> findActivityDetails(UUID userId, UUID activityId) {
        return jdbcClient.sql("""
                SELECT duration_seconds, sport FROM activities
                  WHERE id = :activityId
                    AND user_id = :userId
                    AND deleted_at IS NULL
                """)
                .param("activityId", activityId)
                .param("userId", userId)
                .query((rs, rowNum) -> new SimpleActivityDetails(
                        rs.getInt("duration_seconds"),
                        rs.getString("sport")
                ))
                .optional();
    }

    @Override
    @Transactional
    public void createStandaloneActivityEvent(UUID userId, LocalDate date, UUID activityId, String name, String sport) {
        // Compute the next order_index rather than hardcoding 999, so multiple standalone
        // activities on the same day sort deterministically.
        Integer maxIdx = jdbcClient.sql("""
                SELECT MAX(order_index) FROM calendar_events
                 WHERE user_id    = :userId
                   AND date       = :date
                   AND deleted_at IS NULL
                """)
                .param("userId", userId)
                .param("date",   date)
                .query(Integer.class)
                .optional()
                .orElse(null);
        short nextIdx = (short) (maxIdx != null ? maxIdx + 1 : 0);

        CalendarEventEntity entity = new CalendarEventEntity(userId, date, "workout", name);
        entity.activityId = activityId;
        entity.status     = "completed";
        entity.orderIndex = nextIdx;
        repo.saveAndFlush(entity);
    }

    @Override
    public List<CalendarEventSummary> findSkippedWorkoutsByDate(UUID userId, LocalDate date) {
        return jdbcClient.sql("""
                SELECT c.id, c.user_id, c.date, c.event_type, c.workout_id, c.activity_id,
                       c.title, c.description, c.status, c.order_index, c.compliance_score,
                       w.sport AS workout_sport, w.estimated_duration_seconds AS workout_duration,
                       w.estimated_tss AS workout_tss, w.steps AS workout_steps
                  FROM calendar_events c
                  JOIN workouts w ON w.id = c.workout_id AND w.deleted_at IS NULL
                 WHERE c.user_id = :userId
                   AND c.date = :date
                   AND c.event_type = 'workout'
                   AND c.status = 'skipped'
                   AND c.activity_id IS NULL
                   AND c.deleted_at IS NULL
                 ORDER BY c.order_index ASC
                """)
                .param("userId", userId)
                .param("date",   date)
                .query((rs, rowNum) -> new CalendarEventSummary(
                        rs.getObject("id", UUID.class),
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("date", LocalDate.class),
                        rs.getString("event_type"),
                        rs.getObject("workout_id", UUID.class),
                        rs.getObject("activity_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getShort("order_index"),
                        rs.getBigDecimal("compliance_score"),
                        rs.getString("workout_sport"),
                        nullableInt(rs, "workout_duration"),
                        rs.getBigDecimal("workout_tss"),
                        rs.getString("workout_steps"),
                        null, null, null, null, null, null, null, null, null
                ))
                .list();
    }

    @Override
    public List<AutoLinkActivityCandidate> findAutoLinkActivityCandidates(UUID userId, LocalDate date) {
        return jdbcClient.sql("""
                SELECT id, duration_seconds, sport, name
                  FROM (
                        SELECT a.id,
                               a.duration_seconds,
                               a.sport,
                               a.name,
                               a.started_at,
                               0 AS source_rank
                          FROM calendar_events c
                          JOIN activities a ON a.id = c.activity_id AND a.deleted_at IS NULL
                         WHERE c.user_id = :userId
                           AND c.date = :date
                           AND c.workout_id IS NULL
                           AND c.activity_id IS NOT NULL
                           AND c.deleted_at IS NULL
                           AND NOT EXISTS (
                               SELECT 1
                                 FROM calendar_events linked
                                WHERE linked.user_id = :userId
                                  AND linked.activity_id = a.id
                                  AND linked.workout_id IS NOT NULL
                                  AND linked.deleted_at IS NULL
                           )
                        UNION ALL
                        SELECT a.id,
                               a.duration_seconds,
                               a.sport,
                               a.name,
                               a.started_at,
                               1 AS source_rank
                          FROM activities a
                         WHERE a.user_id = :userId
                           AND a.deleted_at IS NULL
                           AND (
                               date(a.started_at AT TIME ZONE :timezone) = :date
                               OR CAST(a.started_at AS date) = :date
                           )
                           AND NOT EXISTS (
                               SELECT 1
                                 FROM calendar_events c
                                WHERE c.user_id = :userId
                                  AND c.activity_id = a.id
                                  AND c.deleted_at IS NULL
                           )
                  ) candidates
                 ORDER BY source_rank ASC, started_at ASC, id ASC
                """)
                .param("userId", userId)
                .param("date", date)
                .param("timezone", findUserTimezone(userId))
                .query((rs, rowNum) -> new AutoLinkActivityCandidate(
                        rs.getObject("id", UUID.class),
                        rs.getInt("duration_seconds"),
                        rs.getString("sport"),
                        rs.getString("name")
                ))
                .list();
    }

    @Override
    public boolean hasActiveEventForActivity(UUID userId, UUID activityId) {
        return jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                      FROM calendar_events
                     WHERE user_id = :userId
                       AND activity_id = :activityId
                       AND deleted_at IS NULL
                )
                """)
                .param("userId", userId)
                .param("activityId", activityId)
                .query(Boolean.class)
                .single();
    }

    @Override
    public Optional<ActivityStreamData> findActivityStream(UUID activityId) {
        return jdbcClient.sql("""
                SELECT timestamps, heart_rate, power, speed, distance
                  FROM activity_streams
                 WHERE activity_id = :activityId
                """)
                .param("activityId", activityId)
                .query((rs, rowNum) -> {
                    int[] timestamps = toIntArray(rs.getArray("timestamps"));
                    short[] heartRate = toShortArray(rs.getArray("heart_rate"));
                    short[] power = toShortArray(rs.getArray("power"));
                    float[] speed = toFloatArray(rs.getArray("speed"));
                    float[] distance = toFloatArray(rs.getArray("distance"));
                    return new ActivityStreamData(timestamps, heartRate, power, speed, distance);
                })
                .optional();
    }

    @Override
    public Optional<UserSportZones> findUserSportZones(UUID userId, String sport, LocalDate date) {
        return jdbcClient.sql("""
                SELECT sport, ftp, lthr, max_hr, zones::text AS zones_json
                  FROM sport_zones
                 WHERE user_id = :userId
                   AND sport = :sport
                   AND effective_date <= :date
                 ORDER BY effective_date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .param("sport", sport)
                .param("date", date)
                .query((rs, rowNum) -> new UserSportZones(
                        rs.getString("sport"),
                        nullableInt(rs, "ftp"),
                        nullableInt(rs, "lthr"),
                        nullableInt(rs, "max_hr"),
                        rs.getString("zones_json")
                ))
                .optional();
    }

    // Helper conversion methods for PG native arrays
    private static int[] toIntArray(java.sql.Array sqlArray) throws java.sql.SQLException {
        if (sqlArray == null) return new int[0];
        Object array = sqlArray.getArray();
        if (array instanceof Integer[] boxed) {
            int[] unboxed = new int[boxed.length];
            for (int i = 0; i < boxed.length; i++) {
                unboxed[i] = boxed[i] != null ? boxed[i] : 0;
            }
            return unboxed;
        } else if (array instanceof int[] primitive) {
            return primitive;
        }
        return new int[0];
    }

    private static short[] toShortArray(java.sql.Array sqlArray) throws java.sql.SQLException {
        if (sqlArray == null) return new short[0];
        Object array = sqlArray.getArray();
        if (array instanceof Integer[] boxed) {
            short[] unboxed = new short[boxed.length];
            for (int i = 0; i < boxed.length; i++) {
                unboxed[i] = boxed[i] != null ? boxed[i].shortValue() : 0;
            }
            return unboxed;
        } else if (array instanceof Short[] boxed) {
            short[] unboxed = new short[boxed.length];
            for (int i = 0; i < boxed.length; i++) {
                unboxed[i] = boxed[i] != null ? boxed[i] : 0;
            }
            return unboxed;
        } else if (array instanceof short[] primitive) {
            return primitive;
        }
        return new short[0];
    }

    private static float[] toFloatArray(java.sql.Array sqlArray) throws java.sql.SQLException {
        if (sqlArray == null) return new float[0];
        Object array = sqlArray.getArray();
        if (array instanceof Double[] boxed) {
            float[] unboxed = new float[boxed.length];
            for (int i = 0; i < boxed.length; i++) {
                unboxed[i] = boxed[i] != null ? boxed[i].floatValue() : 0.0f;
            }
            return unboxed;
        } else if (array instanceof Float[] boxed) {
            float[] unboxed = new float[boxed.length];
            for (int i = 0; i < boxed.length; i++) {
                unboxed[i] = boxed[i] != null ? boxed[i] : 0.0f;
            }
            return unboxed;
        } else if (array instanceof float[] primitive) {
            return primitive;
        }
        return new float[0];
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private CalendarEventSummary toSummary(CalendarEventEntity e) {
        return new CalendarEventSummary(
                e.id, e.userId, e.date, e.eventType,
                e.workoutId, e.activityId,
                e.title, e.description,
                e.status, e.orderIndex, e.complianceScore,
                null, null, null, null, null, null,
                null, null, null, null, null, null, null
        );
    }

    private static Integer nullableInt(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }
}
