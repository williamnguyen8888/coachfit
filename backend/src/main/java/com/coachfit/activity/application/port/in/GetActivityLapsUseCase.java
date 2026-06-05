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

    List<LapItem> getLaps(UUID userId, UUID activityId);

    record LapItem(
            short      lapIndex,
            Instant    startTime,
            Integer    durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgHeartRate,
            Integer    maxHeartRate,
            Integer    avgPower,
            Integer    maxPower,
            Integer    normalizedPower,
            Integer    avgCadence,
            BigDecimal avgPace,
            BigDecimal maxSpeed,
            BigDecimal elevationGain,
            BigDecimal elevationDescent,
            String     lapTrigger
    ) {}
}
