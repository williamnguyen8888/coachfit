package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.GetActivityUseCase.ActivityDetail;
import com.coachfit.activity.application.port.in.GetActivityUseCase.GearRef;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * HTTP response body for {@code GET /api/v1/activities/{id}} (200 OK).
 *
 * <p>Mirrors the shape documented in docs/05-api-design.md §GET /activities/{id}.
 */
public record ActivityDetailResponse(
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
        GearRefDto gear,
        String     source,
        String     rawFileFormat
) {

    public record GearRefDto(UUID id, String name) {}

    public static ActivityDetailResponse from(ActivityDetail detail) {
        GearRefDto gear = detail.gear() != null
                ? new GearRefDto(detail.gear().id(), detail.gear().name())
                : null;

        return new ActivityDetailResponse(
                detail.id(),
                detail.sport(),
                detail.subSport(),
                detail.name(),
                detail.description(),
                detail.startedAt(),
                detail.durationSeconds(),
                detail.movingTimeSeconds(),
                detail.distanceMeters(),
                detail.elevationGainMeters(),
                detail.calories(),
                detail.avgHeartRate(),
                detail.maxHeartRate(),
                detail.avgPower(),
                detail.maxPower(),
                detail.normalizedPower(),
                detail.intensityFactor(),
                detail.tss(),
                detail.avgCadence(),
                detail.avgSpeed(),
                detail.startLat(),
                detail.startLng(),
                gear,
                detail.source(),
                detail.rawFileFormat()
        );
    }
}
