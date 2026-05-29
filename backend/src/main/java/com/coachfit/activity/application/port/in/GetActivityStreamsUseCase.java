package com.coachfit.activity.application.port.in;

import java.util.UUID;

/**
 * Input port: get time-series streams for an activity
 * (GET /api/v1/activities/{id}/streams).
 *
 * <p>Arrays are parallel — index {@code i} across all non-null arrays refers
 * to the same data point. Null arrays indicate a stream that was not recorded.
 */
public interface GetActivityStreamsUseCase {

    /**
     * Loads the stream data for an activity.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId requested activity UUID
     * @return streams (never null; individual array fields may be null)
     * @throws org.springframework.web.server.ResponseStatusException 404 if activity not found
     * @throws org.springframework.security.access.AccessDeniedException if owned by another user
     */
    ActivityStreams getStreams(UUID userId, UUID activityId);

    // ── Result type ───────────────────────────────────────────────────────────

    record ActivityStreams(
            UUID     activityId,
            int[]    timestamps,   // seconds from activity start
            short[]  heartRate,    // bpm
            short[]  power,        // watts
            short[]  cadence,      // rpm
            float[]  speed,        // m/s
            float[]  altitude,     // metres
            double[] latitude,
            double[] longitude,
            float[]  distance,     // metres cumulative
            short[]  temperature,  // °C
            float[]  grade         // %
    ) {}
}
