package com.coachfit.analytics.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: best mean-maximal power curve (power duration curve).
 *
 * <p>Returns the athlete's best average power over a set of standard durations
 * within a rolling window. Commonly used in cycling analytics to characterise
 * a rider's energy system profile.
 *
 * <p>Endpoint: {@code GET /api/v1/training-load/power-curve?days=90}
 *
 * <p>Tier: 💎 Pro
 */
public interface GetPowerCurveUseCase {

    /**
     * Standard duration breakpoints (in seconds) used across all power curves.
     * Covers efforts from a 1-second sprint to a 2-hour sustained effort.
     */
    int[] STANDARD_DURATIONS = {
            1, 2, 5, 10, 15, 20, 30,
            60, 120, 180, 300, 360, 600,
            1200, 1800, 2700, 3600, 5400, 7200
    };

    /**
     * Returns the power duration curve for the given window.
     *
     * @param userId the authenticated user
     * @param query  lookback window and optional sport filter
     * @return ordered list of (duration, watts) pairs; only durations with data are returned
     */
    List<PowerCurvePoint> getPowerCurve(UUID userId, PowerCurveQuery query);

    /**
     * Query parameters for the power curve.
     *
     * @param days  number of days to look back (1–365, default 90)
     * @param sport sport filter; if null, defaults to "cycling" (power is cycling-specific)
     */
    record PowerCurveQuery(int days, String sport) {}

    /**
     * A single point on the power duration curve.
     *
     * @param durationSeconds  duration of the effort in seconds
     * @param watts            best mean power (W) over that duration in the given window
     * @param achievedAt       timestamp of the activity that produced this best effort
     */
    record PowerCurvePoint(
            int     durationSeconds,
            int     watts,
            Instant achievedAt
    ) {}
}
