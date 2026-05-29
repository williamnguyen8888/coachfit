package com.coachfit.wellness.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: wellness log persistence.
 *
 * <p>Upsert merges fields from multiple sources into one row per day.
 * Callers should pass non-null fields only; the adapter sets only provided columns.
 */
public interface WellnessLogPersistencePort {

    /**
     * Merges wellness data into the user's log for {@code date}.
     * Only non-null fields in {@link WellnessFields} are written.
     * {@code fieldSources} is merged with the existing JSONB value.
     */
    void upsert(UUID userId, LocalDate date, String source, WellnessFields fields);

    Optional<WellnessSnapshot> findByUserAndDate(UUID userId, LocalDate date);

    // ── Data carriers ────────────────────────────────────────────────────────

    record WellnessFields(
            Short      mood,
            Short      rpe,
            Short      sleepQuality,
            BigDecimal sleepHours,
            Short      fatigue,
            Short      soreness,
            Short      stressLevel,
            Integer    restingHr,
            BigDecimal hrv,
            BigDecimal weightKg,
            String     notes,
            String     fieldSources   // JSON string: {"mood":"manual","resting_hr":"garmin"}
    ) {}

    record WellnessSnapshot(
            LocalDate  date,
            String     source,
            Short      mood,
            Short      rpe,
            Short      sleepQuality,
            BigDecimal sleepHours,
            Short      fatigue,
            Short      soreness,
            Short      stressLevel,
            Integer    restingHr,
            BigDecimal hrv,
            BigDecimal weightKg,
            String     notes,
            String     fieldSources
    ) {}
}
