package com.coachfit.activity.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Input port: get the full detail of a single activity
 * (GET /api/v1/activities/{id}).
 *
 * <p>The returned {@link ActivityDetail} maps directly to the response body
 * documented in docs/05-api-design.md §GET /activities/{id}.
 */
public interface GetActivityUseCase {

    /**
     * Loads the full detail view of an activity belonging to the user.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId requested activity UUID
     * @return full activity detail
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / deleted
     * @throws org.springframework.security.access.AccessDeniedException if the activity belongs to another user
     */
    ActivityDetail get(UUID userId, UUID activityId);

    // ── Result type ───────────────────────────────────────────────────────────

    record GearRef(UUID id, String name) {}

    record ActivityDetail(
            UUID       id,
            String     sport,
            String     subSport,
            String     name,
            String     description,
            Instant    startedAt,
            int        durationSeconds,
            Integer    movingTimeSeconds,
            BigDecimal distanceMeters,
            BigDecimal elevationGainMeters,
            Integer    calories,
            Integer    avgHeartRate,
            Integer    maxHeartRate,
            Integer    avgPower,
            Integer    maxPower,
            Integer    normalizedPower,
            BigDecimal intensityFactor,
            BigDecimal tss,
            Integer    avgCadence,
            BigDecimal avgSpeed,
            BigDecimal startLat,
            BigDecimal startLng,
            GearRef    gear,
            String     source,
            String     rawFileFormat
    ) {}
}
