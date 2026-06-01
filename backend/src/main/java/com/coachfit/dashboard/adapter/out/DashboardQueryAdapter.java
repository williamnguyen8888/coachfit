package com.coachfit.dashboard.adapter.out;

import com.coachfit.dashboard.application.port.out.DashboardQueryPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link DashboardQueryPort}.
 *
 * <p>All queries are read-only aggregations across multiple tables.
 * Dashboard goes directly to the DB to avoid cross-module service calls,
 * keeping the modulith boundary intact (allowed dependencies: shared only).
 */
@Repository
class DashboardQueryAdapter implements DashboardQueryPort {

    private final JdbcClient jdbcClient;

    DashboardQueryAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // ── Calendar ──────────────────────────────────────────────────────────────

    @Override
    public Optional<PlannedWorkout> findTodayPlannedWorkout(UUID userId, LocalDate date) {
        return jdbcClient.sql("""
                SELECT ce.id, ce.title,
                       COALESCE(w.sport, ce.event_type) AS sport
                  FROM calendar_events ce
                  LEFT JOIN workouts w ON w.id = ce.workout_id AND w.deleted_at IS NULL
                 WHERE ce.user_id    = :userId
                   AND ce.date       = :date
                   AND ce.status     = 'planned'
                   AND ce.deleted_at IS NULL
                 ORDER BY ce.order_index
                 LIMIT 1
                """)
                .param("userId", userId)
                .param("date", date)
                .query((rs, rowNum) -> new PlannedWorkout(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("sport")))
                .optional();
    }

    @Override
    public double sumPlannedHoursInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd) {
        Double result = jdbcClient.sql("""
                SELECT COALESCE(SUM(w.estimated_duration_seconds), 0) / 3600.0
                  FROM calendar_events ce
                  JOIN workouts w ON w.id = ce.workout_id AND w.deleted_at IS NULL
                 WHERE ce.user_id    = :userId
                   AND ce.date BETWEEN :weekStart AND :weekEnd
                   AND ce.event_type = 'workout'
                   AND ce.deleted_at IS NULL
                """)
                .param("userId", userId)
                .param("weekStart", weekStart)
                .param("weekEnd", weekEnd)
                .query(Double.class)
                .single();
        return result != null ? result : 0.0;
    }

    @Override
    public double sumCompletedHoursInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd) {
        Double result = jdbcClient.sql("""
                SELECT COALESCE(SUM(a.duration_seconds), 0) / 3600.0
                  FROM activities a
                  JOIN users u ON u.id = a.user_id AND u.deleted_at IS NULL
                 WHERE a.user_id    = :userId
                   AND a.deleted_at IS NULL
                   AND date(a.started_at AT TIME ZONE COALESCE(NULLIF(u.settings->>'timezone', ''), 'Asia/Ho_Chi_Minh'))
                       BETWEEN :weekStart AND :weekEnd
                """)
                .param("userId", userId)
                .param("weekStart", weekStart)
                .param("weekEnd", weekEnd)
                .query(Double.class)
                .single();
        return result != null ? result : 0.0;
    }

    @Override
    public int countCompletedSessionsInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd) {
        Integer result = jdbcClient.sql("""
                SELECT COUNT(*)::int
                  FROM activities a
                  JOIN users u ON u.id = a.user_id AND u.deleted_at IS NULL
                 WHERE a.user_id    = :userId
                   AND a.deleted_at IS NULL
                   AND date(a.started_at AT TIME ZONE COALESCE(NULLIF(u.settings->>'timezone', ''), 'Asia/Ho_Chi_Minh'))
                       BETWEEN :weekStart AND :weekEnd
                """)
                .param("userId", userId)
                .param("weekStart", weekStart)
                .param("weekEnd", weekEnd)
                .query(Integer.class)
                .single();
        return result != null ? result : 0;
    }

    // ── Activities ────────────────────────────────────────────────────────────

    @Override
    public List<RecentActivityRow> findRecentActivities(UUID userId, int limit) {
        return jdbcClient.sql("""
                SELECT id, sport, name, started_at, duration_seconds,
                       distance_meters, avg_power, tss
                  FROM activities
                 WHERE user_id    = :userId
                   AND deleted_at IS NULL
                 ORDER BY started_at DESC
                 LIMIT :limit
                """)
                .param("userId", userId)
                .param("limit", limit)
                .query((rs, rowNum) -> new RecentActivityRow(
                        rs.getObject("id", UUID.class),
                        rs.getString("sport"),
                        rs.getString("name"),
                        toInstant(rs, "started_at"),
                        rs.getInt("duration_seconds"),
                        rs.getBigDecimal("distance_meters"),
                        nullableInt(rs, "avg_power"),
                        rs.getBigDecimal("tss")))
                .list();
    }

    @Override
    public List<SportVolumeRow> aggregateSportVolume(UUID userId, LocalDate from, LocalDate to) {
        return jdbcClient.sql("""
                SELECT a.sport,
                       COALESCE(SUM(a.duration_seconds), 0) / 3600.0 AS hours,
                       COUNT(*)::int                                   AS sessions,
                       COALESCE(SUM(a.distance_meters), 0)            AS distance_meters,
                       COALESCE(SUM(a.tss), 0)                        AS tss
                  FROM activities a
                  JOIN users u ON u.id = a.user_id AND u.deleted_at IS NULL
                 WHERE a.user_id    = :userId
                   AND a.deleted_at IS NULL
                   AND date(a.started_at AT TIME ZONE COALESCE(NULLIF(u.settings->>'timezone', ''), 'Asia/Ho_Chi_Minh'))
                       BETWEEN :from AND :to
                 GROUP BY a.sport
                 ORDER BY hours DESC
                """)
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new SportVolumeRow(
                        rs.getString("sport"),
                        rs.getDouble("hours"),
                        rs.getInt("sessions"),
                        rs.getBigDecimal("distance_meters"),
                        rs.getBigDecimal("tss")))
                .list();
    }

    @Override
    public WeekTotals sumWeekTotals(UUID userId, LocalDate from, LocalDate to) {
        return jdbcClient.sql("""
                SELECT COALESCE(SUM(a.distance_meters), 0) AS total_distance_meters,
                       COALESCE(SUM(a.tss), 0)             AS total_tss
                  FROM activities a
                  JOIN users u ON u.id = a.user_id AND u.deleted_at IS NULL
                 WHERE a.user_id    = :userId
                   AND a.deleted_at IS NULL
                   AND date(a.started_at AT TIME ZONE COALESCE(NULLIF(u.settings->>'timezone', ''), 'Asia/Ho_Chi_Minh'))
                       BETWEEN :from AND :to
                """)
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new WeekTotals(
                        rs.getBigDecimal("total_distance_meters"),
                        rs.getBigDecimal("total_tss")))
                .single();
    }

    // ── Training load ─────────────────────────────────────────────────────────

    @Override
    public Optional<TrainingLoadRow> findTrainingLoadForDate(UUID userId, LocalDate date) {
        return jdbcClient.sql("""
                SELECT date, ctl, atl, tsb, daily_tss
                  FROM training_load
                 WHERE user_id = :userId
                   AND sport   = 'all'
                   AND date    = :date
                """)
                .param("userId", userId)
                .param("date", date)
                .query((rs, rowNum) -> new TrainingLoadRow(
                        rs.getObject("date", LocalDate.class),
                        rs.getBigDecimal("ctl"),
                        rs.getBigDecimal("atl"),
                        rs.getBigDecimal("tsb"),
                        rs.getBigDecimal("daily_tss")))
                .optional();
    }

    @Override
    public List<TrainingLoadRow> findTrainingLoadRange(UUID userId, LocalDate from, LocalDate to) {
        return jdbcClient.sql("""
                SELECT date, ctl, atl, tsb, daily_tss
                  FROM training_load
                 WHERE user_id = :userId
                   AND sport   = 'all'
                   AND date BETWEEN :from AND :to
                 ORDER BY date ASC
                """)
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new TrainingLoadRow(
                        rs.getObject("date", LocalDate.class),
                        rs.getBigDecimal("ctl"),
                        rs.getBigDecimal("atl"),
                        rs.getBigDecimal("tsb"),
                        rs.getBigDecimal("daily_tss")))
                .list();
    }

    // ── Health ────────────────────────────────────────────────────────────────

    @Override
    public Optional<DailyHealthRow> findLatestDailyHealth(UUID userId, String source, LocalDate asOf) {
        return jdbcClient.sql("""
                SELECT date, source, steps, resting_hr,
                       avg_stress, max_stress, body_battery_high, avg_spo2
                  FROM health_daily_summaries
                 WHERE user_id = :userId
                   AND source  = :source
                   AND date   <= :asOf
                 ORDER BY date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .param("source", source)
                .param("asOf", asOf)
                .query((rs, rowNum) -> new DailyHealthRow(
                        rs.getObject("date", LocalDate.class),
                        rs.getString("source"),
                        nullableInt(rs, "steps"),
                        nullableInt(rs, "resting_hr"),
                        nullableInt(rs, "avg_stress"),
                        nullableInt(rs, "max_stress"),
                        nullableInt(rs, "body_battery_high"),
                        rs.getBigDecimal("avg_spo2")))
                .optional();
    }

    @Override
    public Optional<SleepHealthRow> findLatestSleep(UUID userId, String source, LocalDate asOf) {
        return jdbcClient.sql("""
                SELECT date, source,
                       duration_seconds, deep_seconds, light_seconds,
                       rem_seconds, awake_seconds,
                       sleep_score, avg_hrv, hrv_status
                  FROM health_sleep_data
                 WHERE user_id = :userId
                   AND source  = :source
                   AND date   <= :asOf
                 ORDER BY date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .param("source", source)
                .param("asOf", asOf)
                .query((rs, rowNum) -> new SleepHealthRow(
                        rs.getObject("date", LocalDate.class),
                        rs.getString("source"),
                        nullableInt(rs, "duration_seconds"),
                        nullableInt(rs, "deep_seconds"),
                        nullableInt(rs, "light_seconds"),
                        nullableInt(rs, "rem_seconds"),
                        nullableInt(rs, "awake_seconds"),
                        nullableInt(rs, "sleep_score"),
                        rs.getBigDecimal("avg_hrv"),
                        rs.getString("hrv_status")))
                .optional();
    }

    @Override
    public Optional<String> getUserFullName(UUID userId) {
        return jdbcClient.sql("""
                SELECT full_name
                  FROM users
                 WHERE id = :userId
                   AND deleted_at IS NULL
                """)
                .param("userId", userId)
                .query(String.class)
                .optional();
    }

    @Override
    public Optional<String> findPrimaryHealthSource(UUID userId) {
        return jdbcClient.sql("""
                SELECT primary_health_source
                  FROM athlete_profiles
                 WHERE user_id = :userId
                """)
                .param("userId", userId)
                .query(String.class)
                .optional();
    }

    @Override
    public String findUserTimezone(UUID userId) {
        return jdbcClient.sql("""
                SELECT COALESCE(NULLIF(settings->>'timezone', ''), 'Asia/Ho_Chi_Minh')
                  FROM users
                 WHERE id = :userId
                   AND deleted_at IS NULL
                """)
                .param("userId", userId)
                .query(String.class)
                .optional()
                .orElse("Asia/Ho_Chi_Minh");
    }

    // ── Wellness ──────────────────────────────────────────────────────────────

    @Override
    public Optional<WellnessRow> findMostRecentWellness(UUID userId, LocalDate from, LocalDate to) {
        return jdbcClient.sql("""
                SELECT date, mood, rpe
                  FROM wellness_logs
                 WHERE user_id = :userId
                   AND date BETWEEN :from AND :to
                 ORDER BY date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new WellnessRow(
                        rs.getObject("date", LocalDate.class),
                        nullableShort(rs, "mood"),
                        nullableShort(rs, "rpe")))
                .optional();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static Short nullableShort(ResultSet rs, String col) throws SQLException {
        short v = rs.getShort(col);
        return rs.wasNull() ? null : v;
    }

    private static Instant toInstant(ResultSet rs, String col) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(col);
        return ts != null ? ts.toInstant() : null;
    }
}
