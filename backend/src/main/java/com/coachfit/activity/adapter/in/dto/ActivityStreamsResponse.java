package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.GetActivityStreamsUseCase.ActivityStreams;

import java.util.UUID;

/**
 * HTTP response body for {@code GET /api/v1/activities/{id}/streams} (200 OK).
 *
 * <p>Arrays are parallel — index {@code i} across all non-null arrays refers to the
 * same data point. Null arrays indicate a stream that was not recorded for this activity.
 */
public record ActivityStreamsResponse(
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
) {
    public static ActivityStreamsResponse from(ActivityStreams s) {
        return new ActivityStreamsResponse(
                s.activityId(),
                s.timestamps(),
                s.heartRate(),
                s.power(),
                s.cadence(),
                s.speed(),
                s.altitude(),
                s.latitude(),
                s.longitude(),
                s.distance(),
                s.temperature(),
                s.grade()
        );
    }
}
