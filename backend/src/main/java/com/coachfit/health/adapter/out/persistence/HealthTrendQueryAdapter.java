package com.coachfit.health.adapter.out.persistence;

import com.coachfit.health.application.port.out.HealthTrendQueryPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link HealthTrendQueryPort}.
 *
 * <p>Routes each metric to the correct table and column.
 * The metric name is validated against an allowlist to prevent SQL injection.
 */
@Repository
class HealthTrendQueryAdapter implements HealthTrendQueryPort {

    /** Metrics that live in {@code health_daily_summaries}. */
    private static final Set<String> DAILY_METRICS =
            Set.of("resting_hr", "steps", "vo2max", "spo2", "stress");

    /** Metrics that live in {@code health_sleep_data}. */
    private static final Set<String> SLEEP_METRICS =
            Set.of("sleep_score", "hrv");

    /** Metrics that live in {@code wellness_logs}. */
    private static final Set<String> WELLNESS_METRICS =
            Set.of("weight");

    private final JdbcClient jdbcClient;

    HealthTrendQueryAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<MetricPoint> queryMetric(UUID userId, String metric, LocalDate from, LocalDate to) {
        if (DAILY_METRICS.contains(metric)) {
            return queryDailyMetric(userId, metric, from, to);
        } else if (SLEEP_METRICS.contains(metric)) {
            return querySleepMetric(userId, metric, from, to);
        } else if (WELLNESS_METRICS.contains(metric)) {
            return queryWellnessMetric(userId, metric, from, to);
        } else {
            throw new IllegalArgumentException("Unknown metric: " + metric);
        }
    }

    // ── Daily summaries ───────────────────────────────────────────────────────

    private List<MetricPoint> queryDailyMetric(UUID userId, String metric,
                                                LocalDate from, LocalDate to) {
        String col = dailyColumnFor(metric);
        return jdbcClient.sql("""
                SELECT date, source, CAST(%s AS NUMERIC) AS value
                  FROM health_daily_summaries
                 WHERE user_id = :userId
                   AND date BETWEEN :from AND :to
                   AND %s IS NOT NULL
                 ORDER BY date DESC, source
                """.formatted(col, col))
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new MetricPoint(
                        rs.getObject("date", LocalDate.class),
                        rs.getString("source"),
                        rs.getBigDecimal("value")))
                .list();
    }

    // ── Sleep data ────────────────────────────────────────────────────────────

    private List<MetricPoint> querySleepMetric(UUID userId, String metric,
                                                LocalDate from, LocalDate to) {
        String col = sleepColumnFor(metric);
        return jdbcClient.sql("""
                SELECT date, source, CAST(%s AS NUMERIC) AS value
                  FROM health_sleep_data
                 WHERE user_id = :userId
                   AND date BETWEEN :from AND :to
                   AND %s IS NOT NULL
                 ORDER BY date DESC, source
                """.formatted(col, col))
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new MetricPoint(
                        rs.getObject("date", LocalDate.class),
                        rs.getString("source"),
                        rs.getBigDecimal("value")))
                .list();
    }

    // ── Wellness logs ─────────────────────────────────────────────────────────

    private List<MetricPoint> queryWellnessMetric(UUID userId, String metric,
                                                   LocalDate from, LocalDate to) {
        String col = wellnessColumnFor(metric);
        return jdbcClient.sql("""
                SELECT date, source, CAST(%s AS NUMERIC) AS value
                  FROM wellness_logs
                 WHERE user_id = :userId
                   AND date BETWEEN :from AND :to
                   AND %s IS NOT NULL
                 ORDER BY date DESC, source
                """.formatted(col, col))
                .param("userId", userId)
                .param("from", from)
                .param("to", to)
                .query((rs, rowNum) -> new MetricPoint(
                        rs.getObject("date", LocalDate.class),
                        rs.getString("source"),
                        rs.getBigDecimal("value")))
                .list();
    }

    // ── Column mapping ─────────────────────────────────────────────────────────

    private static String dailyColumnFor(String metric) {
        return switch (metric) {
            case "resting_hr" -> "resting_hr";
            case "steps"      -> "steps";
            case "vo2max"     -> "vo2max";
            case "spo2"       -> "avg_spo2";
            case "stress"     -> "avg_stress";
            default -> throw new IllegalArgumentException("Unknown daily metric: " + metric);
        };
    }

    private static String sleepColumnFor(String metric) {
        return switch (metric) {
            case "sleep_score" -> "sleep_score";
            case "hrv"         -> "avg_hrv";
            default -> throw new IllegalArgumentException("Unknown sleep metric: " + metric);
        };
    }

    private static String wellnessColumnFor(String metric) {
        return switch (metric) {
            case "weight" -> "weight_kg";
            default -> throw new IllegalArgumentException("Unknown wellness metric: " + metric);
        };
    }
}
