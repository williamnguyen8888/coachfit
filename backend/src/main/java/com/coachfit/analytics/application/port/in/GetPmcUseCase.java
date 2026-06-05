package com.coachfit.analytics.application.port.in;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: Performance Management Chart (PMC) data.
 *
 * <p>Returns a chronologically ordered series of CTL/ATL/TSB data points for
 * the given user, date range, and sport. Used to render the PMC chart on the
 * analytics dashboard.
 *
 * <p>Endpoint: {@code GET /api/v1/training-load/pmc?from=...&to=...&sport=...}
 *
 * <p>Tier: 💎 Pro
 */
public interface GetPmcUseCase {

    /**
     * Returns an ordered list of daily PMC data points.
     *
     * @param userId  the authenticated user
     * @param query   date range and optional sport filter
     * @return ordered list of PMC data points (may be empty if no training load data exists)
     */
    List<PmcPoint> getPmc(UUID userId, PmcQuery query);

    /**
     * Query parameters for the PMC chart.
     *
     * @param from   start date (inclusive)
     * @param to     end date (inclusive)
     * @param sport  sport filter; {@code null} or {@code "all"} for the cross-sport rollup
     */
    record PmcQuery(LocalDate from, LocalDate to, String sport) {}

    /**
     * A single day's training load metrics.
     *
     * @param date      the calendar date
     * @param ctl       Chronic Training Load (fitness, 42-day EMA) — may be null if not yet computed
     * @param atl       Acute Training Load (fatigue, 7-day EMA) — may be null if not yet computed
     * @param tsb       Training Stress Balance (form = CTL - ATL) — may be null if not yet computed
     * @param dailyTss  total Training Stress Score logged on this date
     */
    record PmcPoint(
            LocalDate   date,
            BigDecimal  ctl,
            BigDecimal  atl,
            BigDecimal  tsb,
            BigDecimal  dailyTss
    ) {}
}
