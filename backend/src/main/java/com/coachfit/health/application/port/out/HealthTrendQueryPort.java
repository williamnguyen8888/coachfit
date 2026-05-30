package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Output port: health metric trend queries.
 *
 * <p>Used by GET /api/v1/health/trends to build time-series for a single metric
 * across all connected providers.
 */
public interface HealthTrendQueryPort {

    /**
     * Returns one value per (date, source) pair for the requested metric,
     * in the given date range, ordered by date DESC.
     *
     * <p>Supported metrics and their source columns:
     * <ul>
     *   <li>{@code resting_hr}  — health_daily_summaries.resting_hr</li>
     *   <li>{@code steps}       — health_daily_summaries.steps</li>
     *   <li>{@code vo2max}      — health_daily_summaries.vo2max</li>
     *   <li>{@code spo2}        — health_daily_summaries.avg_spo2</li>
     *   <li>{@code stress}      — health_daily_summaries.avg_stress</li>
     *   <li>{@code sleep_score} — health_sleep_data.sleep_score</li>
     *   <li>{@code hrv}         — health_sleep_data.avg_hrv</li>
     *   <li>{@code weight}      — wellness_logs.weight_kg (manual / scale)</li>
     * </ul>
     */
    List<MetricPoint> queryMetric(UUID userId, String metric, LocalDate from, LocalDate to);

    record MetricPoint(
            LocalDate  date,
            String     source,
            BigDecimal value
    ) {}
}
