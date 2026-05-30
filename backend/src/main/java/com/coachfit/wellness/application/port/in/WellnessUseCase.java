package com.coachfit.wellness.application.port.in;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: wellness log read and write use cases.
 *
 * <pre>
 * GET /api/v1/wellness?from=...&amp;to=...  — list entries
 * POST /api/v1/wellness                  — log manual entry
 * PUT  /api/v1/wellness/{date}           — update entry for a specific date
 * </pre>
 */
public interface WellnessUseCase {

    /**
     * Returns wellness log entries in the given date range, ordered date DESC.
     */
    List<WellnessEntry> list(UUID userId, LocalDate from, LocalDate to);

    /**
     * Logs or merges a manual wellness entry for today or a given date.
     *
     * @return the merged entry after upsert
     */
    WellnessEntry log(UUID userId, LocalDate date, WellnessInput input);

    /**
     * Updates a wellness entry for a specific date. Null fields are ignored (merge semantics).
     *
     * @return the merged entry after update
     */
    WellnessEntry update(UUID userId, LocalDate date, WellnessInput input);

    // ── Data carriers ─────────────────────────────────────────────────────────

    record WellnessInput(
            Short      mood,          // 1-5
            Short      rpe,           // 1-10
            Short      sleepQuality,  // 1-5
            BigDecimal sleepHours,
            Short      fatigue,       // 1-5
            Short      soreness,      // 1-5
            Short      stressLevel,   // 1-5
            Integer    restingHr,
            BigDecimal hrv,
            BigDecimal weightKg,
            String     notes
    ) {}

    record WellnessEntry(
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
