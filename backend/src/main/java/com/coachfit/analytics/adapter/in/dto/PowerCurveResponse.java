package com.coachfit.analytics.adapter.in.dto;

import com.coachfit.analytics.application.port.in.GetPowerCurveUseCase.PowerCurvePoint;

import java.time.Instant;
import java.util.List;

/**
 * JSON response body for {@code GET /api/v1/training-load/power-curve}.
 *
 * <pre>
 * {
 *   "sport":       "cycling",
 *   "days":        90,
 *   "generatedAt": "2025-03-15T10:00:00Z",
 *   "curve": [
 *     { "durationSeconds": 5,   "watts": 820,  "achievedAt": "2025-02-10T07:00:00Z" },
 *     { "durationSeconds": 60,  "watts": 420,  "achievedAt": "2025-01-28T06:45:00Z" }
 *   ]
 * }
 * </pre>
 */
public record PowerCurveResponse(
        String      sport,
        int         days,
        Instant     generatedAt,
        List<Point> curve
) {

    public record Point(
            int     durationSeconds,
            int     watts,
            Instant achievedAt
    ) {}

    /**
     * Converts use-case output to the HTTP response body.
     */
    public static PowerCurveResponse from(
            String sport,
            int days,
            List<PowerCurvePoint> curvePoints) {

        List<Point> curve = curvePoints.stream()
                .map(p -> new Point(p.durationSeconds(), p.watts(), p.achievedAt()))
                .toList();

        return new PowerCurveResponse(sport, days, Instant.now(), curve);
    }
}
