package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
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
}
