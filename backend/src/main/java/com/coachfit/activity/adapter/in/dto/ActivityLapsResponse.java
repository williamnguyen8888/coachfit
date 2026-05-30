package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.GetActivityLapsUseCase.LapItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * HTTP response body for {@code GET /api/v1/activities/{id}/laps} (200 OK).
 */
public record ActivityLapsResponse(List<LapDto> laps) {

    public record LapDto(
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
            BigDecimal avgSpeed,
            BigDecimal elevationGain
    ) {}

    public static ActivityLapsResponse from(List<LapItem> laps) {
        return new ActivityLapsResponse(
                laps.stream()
                        .map(l -> new LapDto(
                                l.lapIndex(), l.startTime(), l.durationSeconds(),
                                l.distanceMeters(), l.avgHeartRate(), l.maxHeartRate(),
                                l.avgPower(), l.maxPower(), l.avgCadence(),
                                l.avgPace(), l.avgPace(), l.elevationGain()))
                        .toList()
        );
    }
}
