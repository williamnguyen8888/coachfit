package com.coachfit.dashboard.application.port.in;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: GET /api/v1/dashboard/fitness-trend?days=N — CTL/ATL/TSB sparkline.
 *
 * <p>Free tier: last 28 days. Pro/Elite: up to 365 days.
 */
public interface GetFitnessTrendUseCase {

    FitnessTrend getFitnessTrend(UUID userId, int days);

    // ── Result types ─────────────────────────────────────────────────────────

    record FitnessTrend(
            String          sport,   // "all"
            List<TrendPoint> points
    ) {}

    record TrendPoint(
            LocalDate  date,
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb,
            BigDecimal dailyTss
    ) {}
}
