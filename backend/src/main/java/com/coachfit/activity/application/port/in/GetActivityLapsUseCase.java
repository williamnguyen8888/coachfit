package com.coachfit.activity.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: get laps for an activity
 * (GET /api/v1/activities/{id}/laps).
 */
public interface GetActivityLapsUseCase {

    /**
     * Loads the ordered list of laps for an activity.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId requested activity UUID
     * @return ordered lap list (empty if no laps were recorded)
     * @throws org.springframework.web.server.ResponseStatusException 404 if activity not found
     * @throws org.springframework.security.access.AccessDeniedException if owned by another user
     */
    List<LapItem> getLaps(UUID userId, UUID activityId);

    // ── Result type ───────────────────────────────────────────────────────────

    record LapItem(
            short      lapIndex,
            Instant    startTime,
            Integer    durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgHeartRate,
            Integer    maxHeartRate,
            Integer    avgPower,
            Integer    maxPower,
            Integer    avgCadence,
            BigDecimal avgPace,
            BigDecimal elevationGain
    ) {}
}
