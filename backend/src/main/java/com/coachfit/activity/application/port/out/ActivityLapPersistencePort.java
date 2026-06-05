package com.coachfit.activity.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Output port: activity lap persistence.
 */
public interface ActivityLapPersistencePort {

    /**
     * Replaces all laps for an activity (delete-then-insert).
     */
    void replaceAll(UUID activityId, List<LapData> laps);

    List<LapData> findByActivityId(UUID activityId);

    // ── Data carrier ─────────────────────────────────────────────────────────

    record LapData(
            short       lapIndex,
            Instant     startTime,
            Integer     durationSeconds,
            BigDecimal  distanceMeters,
            Integer     avgHeartRate,
            Integer     maxHeartRate,
            Integer     avgPower,
            Integer     maxPower,
            Integer     normalizedPower,
            Integer     avgCadence,
            BigDecimal  avgPace,
            BigDecimal  maxSpeed,
            BigDecimal  elevationGain,
            BigDecimal  elevationDescent,
            String      lapTrigger
    ) {}
}
