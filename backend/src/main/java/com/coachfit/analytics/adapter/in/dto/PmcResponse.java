package com.coachfit.analytics.adapter.in.dto;

import com.coachfit.analytics.application.port.in.GetPmcUseCase.PmcPoint;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * JSON response body for {@code GET /api/v1/training-load/pmc}.
 *
 * <pre>
 * {
 *   "sport": "all",
 *   "from":  "2025-01-01",
 *   "to":    "2025-03-31",
 *   "points": [
 *     { "date": "2025-01-01", "ctl": 72.5, "atl": 58.3, "tsb": 14.2, "dailyTss": 0.0 }
 *   ]
 * }
 * </pre>
 */
public record PmcResponse(
        String       sport,
        LocalDate    from,
        LocalDate    to,
        List<Point>  points
) {

    public record Point(
            LocalDate  date,
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb,
            BigDecimal dailyTss
    ) {}

    /**
     * Converts use-case output to the HTTP response body.
     */
    public static PmcResponse from(
            String sport,
            LocalDate from,
            LocalDate to,
            List<PmcPoint> pmcPoints) {

        List<Point> points = pmcPoints.stream()
                .map(p -> new Point(p.date(), p.ctl(), p.atl(), p.tsb(), p.dailyTss()))
                .toList();

        return new PmcResponse(sport, from, to, points);
    }
}
