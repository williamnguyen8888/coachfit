package com.coachfit.dashboard.application.port.in;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: GET /api/v1/dashboard/weekly-summary — weekly volume summary.
 *
 * <p>Returns the current ISO week's planned vs. completed hours and per-sport breakdown.
 */
public interface GetWeeklySummaryUseCase {

    WeeklySummary getWeeklySummary(UUID userId);

    // ── Result types ─────────────────────────────────────────────────────────

    record WeeklySummary(
            LocalDate          weekStart,
            LocalDate          weekEnd,
            double             plannedHours,
            double             completedHours,
            int                completedSessions,
            int                percentage,
            BigDecimal         totalTss,
            BigDecimal         totalDistanceMeters,
            List<SportVolume>  bySport
    ) {}

    record SportVolume(
            String     sport,
            double     hours,
            int        sessions,
            BigDecimal distanceMeters,
            BigDecimal tss
    ) {}
}
