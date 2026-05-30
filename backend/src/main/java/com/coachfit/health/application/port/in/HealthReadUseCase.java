package com.coachfit.health.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: health data read use cases.
 *
 * <pre>
 * GET /api/v1/health/daily?from=...&amp;to=...              — daily summaries, all providers
 * GET /api/v1/health/sleep?from=...&amp;to=...              — sleep records, all providers
 * GET /api/v1/health/trends?metric=resting_hr&amp;days=90   — time-series for a metric
 * </pre>
 *
 * <p>All three endpoints are provider-agnostic: data from Garmin, COROS, Polar,
 * Apple Health etc. is unified in the response via the {@code source} field.
 */
public interface HealthReadUseCase {

    /**
     * Returns daily health summaries for all providers in the given date range.
     * Ordered by date DESC, then source.
     */
    List<DailySummaryEntry> listDaily(UUID userId, LocalDate from, LocalDate to);

    /**
     * Returns sleep records for all providers in the given date range.
     * Ordered by date DESC, then source.
     */
    List<SleepEntry> listSleep(UUID userId, LocalDate from, LocalDate to);

    /**
     * Returns a time-series of a single health metric for the given number of days.
     *
     * @param metric one of: resting_hr, steps, weight, hrv, sleep_score, spo2, stress, vo2max
     * @param days   number of past days to include (default 90)
     */
    List<TrendPoint> getTrend(UUID userId, String metric, int days);

    // ── Result types ─────────────────────────────────────────────────────────

    record DailySummaryEntry(
            LocalDate  date,
            String     source,
            Integer    steps,
            BigDecimal distanceMeters,
            Integer    caloriesTotal,
            Integer    caloriesActive,
            Integer    activeMinutes,
            Integer    intensityMinutes,
            Integer    floorsClimbed,
            Integer    restingHr,
            Integer    avgHr,
            Integer    maxHr,
            Integer    avgStress,
            Integer    maxStress,
            Integer    bodyBatteryHigh,
            Integer    bodyBatteryLow,
            BigDecimal avgSpo2,
            BigDecimal avgRespiration,
            BigDecimal vo2max,
            String     extra
    ) {}

    record SleepEntry(
            LocalDate  date,
            String     source,
            Instant    sleepStart,
            Instant    sleepEnd,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    lightSeconds,
            Integer    remSeconds,
            Integer    awakeSeconds,
            Integer    sleepScore,
            BigDecimal avgRespiration,
            BigDecimal avgSpo2,
            BigDecimal avgHrv,
            String     hrvStatus
    ) {}

    record TrendPoint(
            LocalDate  date,
            String     source,
            BigDecimal value
    ) {}
}
