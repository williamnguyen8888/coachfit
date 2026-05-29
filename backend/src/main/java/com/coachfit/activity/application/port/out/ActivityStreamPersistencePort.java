package com.coachfit.activity.application.port.out;

import java.util.Optional;
import java.util.UUID;

/**
 * Output port: activity stream persistence.
 */
public interface ActivityStreamPersistencePort {

    /**
     * Upserts the full stream for an activity (replaces if exists).
     */
    void upsert(UUID activityId, StreamData data);

    Optional<StreamData> findByActivityId(UUID activityId);

    // ── Data carrier ─────────────────────────────────────────────────────────

    record StreamData(
            int[]    timestamps,
            short[]  heartRate,
            short[]  power,
            short[]  cadence,
            float[]  speed,
            float[]  altitude,
            double[] latitude,
            double[] longitude,
            float[]  distance,
            short[]  temperature,
            float[]  grade
    ) {}
}
