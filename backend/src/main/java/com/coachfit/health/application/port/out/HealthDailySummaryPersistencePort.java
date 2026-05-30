package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: daily health summary persistence.
 *
 * <p>Providers push full day summaries; upsert replaces the row for the
 * (user, source, date) triple.
 */
public interface HealthDailySummaryPersistencePort {

    /**
     * Replaces the health daily summary for the given user/source/date.
     */
    void upsert(UUID userId, LocalDate date, String source, DailySummaryData data);

    Optional<DailySummarySnapshot> findByUserSourceDate(UUID userId, String source, LocalDate date);

    /**
     * Returns all daily summaries for the user in a date range across all sources,
     * ordered by date DESC.
     */
    List<RichDailySummarySnapshot> listRange(UUID userId, LocalDate from, LocalDate to);

    /**
     * Returns the most recent daily summary for a user and source at or before {@code asOf}.
     * Used by the dashboard health snapshot.
     */
    Optional<RichDailySummarySnapshot> findLatest(UUID userId, String source, LocalDate asOf);

    // ── Data carriers ────────────────────────────────────────────────────────

    record DailySummaryData(
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
            BigDecimal weightKg,        // body composition (V026 migration)
            BigDecimal bodyFatPct,
            BigDecimal muscleMassKg,
            BigDecimal boneMassKg,
            BigDecimal bmi,
            String     extra,          // JSON string of provider-specific data
            String     rawPayload      // JSON string of raw provider response
    ) {}

    record DailySummarySnapshot(
            LocalDate  date,
            String     source,
            Integer    steps,
            BigDecimal distanceMeters,
            Integer    caloriesTotal,
            Integer    restingHr,
            BigDecimal avgSpo2,
            BigDecimal vo2max,
            String     extra
    ) {}

    /** Full read model used by the health API and dashboard snapshot. */
    record RichDailySummarySnapshot(
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
            BigDecimal weightKg,
            BigDecimal bodyFatPct,
            BigDecimal bmi,
            String     extra
    ) {}
}
