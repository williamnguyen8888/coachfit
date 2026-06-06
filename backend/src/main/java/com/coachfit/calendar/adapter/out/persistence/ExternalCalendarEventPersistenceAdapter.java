package com.coachfit.calendar.adapter.out.persistence;

import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter for externally managed calendar events.
 *
 * <p>It writes directly to {@code calendar_events} and imported {@code workouts},
 * following the same cross-module database access pattern used by coach assignment.
 */
@Repository
class ExternalCalendarEventPersistenceAdapter implements ExternalCalendarEventPersistencePort {

    private final JdbcClient jdbcClient;

    ExternalCalendarEventPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID createWorkout(UUID userId, ExternalWorkoutDraft draft) {
        UUID id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO workouts
                    (id, user_id, name, sport, description, estimated_duration_seconds,
                     estimated_tss, steps, tags, is_template, is_public, source,
                     created_at, updated_at)
                VALUES
                    (:id, :userId, :name, :sport, :description, :estimatedDuration,
                     :estimatedTss, :steps::jsonb, :tags, false, false, 'import',
                     now(), now())
                """)
                .param("id", id)
                .param("userId", userId)
                .param("name", draft.name())
                .param("sport", draft.sport())
                .param("description", draft.description())
                .param("estimatedDuration", draft.estimatedDurationSeconds())
                .param("estimatedTss", draft.estimatedTss())
                .param("steps", draft.stepsJson())
                .param("tags", draft.tags() != null ? draft.tags().toArray(new String[0]) : null)
                .update();
        return id;
    }

    @Override
    @Transactional
    public boolean updateWorkout(UUID workoutId, UUID userId, ExternalWorkoutDraft draft) {
        int rows = jdbcClient.sql("""
                UPDATE workouts
                   SET name                       = :name,
                       sport                      = :sport,
                       description                = :description,
                       estimated_duration_seconds = :estimatedDuration,
                       estimated_tss              = :estimatedTss,
                       steps                      = :steps::jsonb,
                       tags                       = :tags,
                       updated_at                 = now()
                 WHERE id                         = :id
                   AND user_id                    = :userId
                   AND source                     = 'import'
                   AND deleted_at IS NULL
                """)
                .param("id", workoutId)
                .param("userId", userId)
                .param("name", draft.name())
                .param("sport", draft.sport())
                .param("description", draft.description())
                .param("estimatedDuration", draft.estimatedDurationSeconds())
                .param("estimatedTss", draft.estimatedTss())
                .param("steps", draft.stepsJson())
                .param("tags", draft.tags() != null ? draft.tags().toArray(new String[0]) : null)
                .update();
        return rows > 0;
    }

    @Override
    public boolean workoutAccessible(UUID userId, UUID workoutId) {
        return jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                      FROM workouts
                     WHERE id = :workoutId
                       AND deleted_at IS NULL
                       AND (user_id = :userId OR user_id IS NULL)
                )
                """)
                .param("userId", userId)
                .param("workoutId", workoutId)
                .query(Boolean.class)
                .single();
    }

    @Override
    @Transactional
    public UUID createEvent(UUID userId, ExternalEventDraft draft) {
        UUID id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO calendar_events
                    (id, user_id, date, event_type, workout_id, title, description,
                     status, order_index, external_category, external_uid,
                     external_id, external_source, external_payload,
                     created_at, updated_at)
                VALUES
                    (:id, :userId, :date, :eventType, :workoutId, :title, :description,
                     'planned',
                     COALESCE((
                         SELECT MAX(order_index) + 1
                           FROM calendar_events
                          WHERE user_id = :userId
                            AND date = :date
                            AND deleted_at IS NULL
                     ), 0),
                     :externalCategory, :externalUid,
                     :externalId, :externalSource, :externalPayload::jsonb,
                     now(), now())
                """)
                .param("id", id)
                .param("userId", userId)
                .param("date", draft.date())
                .param("eventType", draft.eventType())
                .param("workoutId", draft.workoutId())
                .param("title", draft.title())
                .param("description", draft.description())
                .param("externalCategory", draft.externalCategory())
                .param("externalUid", draft.externalUid())
                .param("externalId", draft.externalId())
                .param("externalSource", draft.externalSource())
                .param("externalPayload", draft.externalPayloadJson())
                .update();
        return id;
    }

    @Override
    @Transactional
    public boolean updateEvent(UUID eventId, UUID userId, ExternalEventDraft draft) {
        int rows = jdbcClient.sql("""
                UPDATE calendar_events
                   SET date             = :date,
                       event_type       = :eventType,
                       workout_id       = :workoutId,
                       title            = :title,
                       description      = :description,
                       external_category = :externalCategory,
                       external_uid      = :externalUid,
                       external_id      = :externalId,
                       external_source  = :externalSource,
                       external_payload = :externalPayload::jsonb,
                       updated_at       = now()
                 WHERE id               = :id
                   AND user_id          = :userId
                   AND deleted_at IS NULL
                """)
                .param("id", eventId)
                .param("userId", userId)
                .param("date", draft.date())
                .param("eventType", draft.eventType())
                .param("workoutId", draft.workoutId())
                .param("title", draft.title())
                .param("description", draft.description())
                .param("externalCategory", draft.externalCategory())
                .param("externalUid", draft.externalUid())
                .param("externalId", draft.externalId())
                .param("externalSource", draft.externalSource())
                .param("externalPayload", draft.externalPayloadJson())
                .update();
        return rows > 0;
    }

    @Override
    public Optional<ExternalEventRow> findById(UUID eventId) {
        return jdbcClient.sql(baseSelect() + """
                 WHERE c.id = :eventId
                   AND c.deleted_at IS NULL
                """)
                .param("eventId", eventId)
                .query((rs, rowNum) -> toRow(rs))
                .optional();
    }

    @Override
    public Optional<ExternalEventRow> findByExternalId(UUID userId, String externalSource, String externalId) {
        return jdbcClient.sql(baseSelect() + """
                 WHERE c.user_id = :userId
                   AND c.external_source = :externalSource
                   AND c.external_id = :externalId
                   AND c.deleted_at IS NULL
                """)
                .param("userId", userId)
                .param("externalSource", externalSource)
                .param("externalId", externalId)
                .query((rs, rowNum) -> toRow(rs))
                .optional();
    }

    @Override
    public Optional<ExternalEventRow> findByUid(UUID userId, String uid) {
        return jdbcClient.sql(baseSelect() + """
                 WHERE c.user_id = :userId
                   AND c.external_uid = :uid
                   AND c.deleted_at IS NULL
                """)
                .param("userId", userId)
                .param("uid", uid)
                .query((rs, rowNum) -> toRow(rs))
                .optional();
    }

    @Override
    public List<ExternalEventRow> findByDateRange(UUID userId, LocalDate oldest, LocalDate newest,
                                                  List<String> eventCategories, List<String> eventTypes,
                                                  Integer limit) {
        StringBuilder sql = new StringBuilder(baseSelect());
        sql.append("""
                 WHERE c.user_id = :userId
                   AND c.date >= :oldest
                   AND c.date <= :newest
                   AND c.deleted_at IS NULL
                """);
        appendCategoryFilter(sql, "c.", eventCategories, eventTypes);
        sql.append(" ORDER BY c.date ASC, c.order_index ASC, c.created_at ASC\n");
        if (limit != null) {
            sql.append(" LIMIT :limit\n");
        }

        var stmt = jdbcClient.sql(sql.toString())
                .param("userId", userId)
                .param("oldest", oldest)
                .param("newest", newest);
        if (hasCategoryFilter(eventCategories, eventTypes)) {
            stmt = stmt.param("eventCategories", eventCategories);
            stmt = stmt.param("eventTypes", eventTypes);
        }
        if (limit != null) {
            stmt = stmt.param("limit", limit);
        }
        return stmt.query((rs, rowNum) -> toRow(rs)).list();
    }

    @Override
    @Transactional
    public int softDeleteById(UUID eventId, UUID userId) {
        return jdbcClient.sql("""
                UPDATE calendar_events
                   SET deleted_at = now(),
                       updated_at = now()
                 WHERE id = :eventId
                   AND user_id = :userId
                   AND deleted_at IS NULL
                """)
                .param("eventId", eventId)
                .param("userId", userId)
                .update();
    }

    @Override
    @Transactional
    public int softDeleteByExternalId(UUID userId, String externalSource, String externalId) {
        return jdbcClient.sql("""
                UPDATE calendar_events
                   SET deleted_at = now(),
                       updated_at = now()
                 WHERE user_id = :userId
                   AND external_source = :externalSource
                   AND external_id = :externalId
                   AND deleted_at IS NULL
                """)
                .param("userId", userId)
                .param("externalSource", externalSource)
                .param("externalId", externalId)
                .update();
    }

    @Override
    @Transactional
    public int softDeleteRange(UUID userId, String externalSource, LocalDate oldest,
                               LocalDate newest, List<String> eventCategories, List<String> eventTypes) {
        StringBuilder sql = new StringBuilder("""
                UPDATE calendar_events
                   SET deleted_at = now(),
                       updated_at = now()
                 WHERE user_id = :userId
                   AND external_source = :externalSource
                   AND date >= :oldest
                   AND date <= :newest
                   AND deleted_at IS NULL
                """);
        appendCategoryFilter(sql, "", eventCategories, eventTypes);

        var stmt = jdbcClient.sql(sql.toString())
                .param("userId", userId)
                .param("externalSource", externalSource)
                .param("oldest", oldest)
                .param("newest", newest);
        if (hasCategoryFilter(eventCategories, eventTypes)) {
            stmt = stmt.param("eventCategories", eventCategories);
            stmt = stmt.param("eventTypes", eventTypes);
        }
        return stmt.update();
    }

    private static String baseSelect() {
        return """
                SELECT c.id, c.user_id, c.date, c.event_type, c.workout_id,
                       c.title, c.description, c.status,
                       c.external_category, c.external_uid, c.external_id, c.external_source,
                       w.sport AS workout_sport,
                       w.estimated_duration_seconds AS workout_duration,
                       w.estimated_tss AS workout_tss
                  FROM calendar_events c
                  LEFT JOIN workouts w ON w.id = c.workout_id AND w.deleted_at IS NULL
                """;
    }

    private static ExternalEventRow toRow(ResultSet rs) throws SQLException {
        return new ExternalEventRow(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getObject("date", LocalDate.class),
                rs.getString("event_type"),
                rs.getObject("workout_id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getString("external_category"),
                rs.getString("external_uid"),
                rs.getString("external_id"),
                rs.getString("external_source"),
                rs.getString("workout_sport"),
                nullableInt(rs, "workout_duration"),
                rs.getBigDecimal("workout_tss")
        );
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static void appendCategoryFilter(StringBuilder sql,
                                             String prefix,
                                             List<String> eventCategories,
                                             List<String> eventTypes) {
        if (!hasCategoryFilter(eventCategories, eventTypes)) {
            return;
        }
        sql.append("\n   AND (\n")
           .append("         ").append(prefix).append("external_category IN (:eventCategories)\n")
           .append("         OR (").append(prefix).append("external_category IS NULL AND ").append(prefix).append("event_type IN (:eventTypes))\n")
           .append("       )\n");
    }

    private static boolean hasCategoryFilter(List<String> eventCategories, List<String> eventTypes) {
        return eventCategories != null && !eventCategories.isEmpty()
                && eventTypes != null && !eventTypes.isEmpty();
    }
}
