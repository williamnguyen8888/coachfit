package com.coachfit.activity.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Input port: get the full detail of a single activity
 * (GET /api/v1/activities/{id}).
 */
public interface GetActivityUseCase {

    ActivityDetail get(UUID userId, UUID activityId);

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
            BigDecimal totalDescentMeters,
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
            BigDecimal maxSpeed,
            Integer    avgTemperature,
            BigDecimal minAltitude,
            BigDecimal maxAltitude,
            BigDecimal aerobicTrainingEffect,
            BigDecimal anaerobicTrainingEffect,
            BigDecimal avgVerticalOscillation,
            BigDecimal avgGroundContactTime,
            BigDecimal avgStepLength,
            BigDecimal avgVerticalRatio,
            BigDecimal leftRightBalance,
            BigDecimal avgLeftPedalSmoothness,
            BigDecimal avgLeftTorqueEffectiveness,
            BigDecimal poolLength,
            String     swimStroke,
            BigDecimal avgSwolf,
            BigDecimal startLat,
            BigDecimal startLng,
            GearRef    gear,
            String     source,
            String     rawFileFormat
    ) {}
}
