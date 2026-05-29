package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;

import java.time.Instant;
import java.util.UUID;

/**
 * HTTP response body for {@code POST /api/v1/activities/upload} (201 Created).
 *
 * <p>Mirrors the shape documented in docs/05-api-design.md §POST /activities/upload.
 */
public record ActivityResponse(
        UUID    id,
        String  name,
        String  sport,
        Instant startedAt,
        int     durationSeconds,
        Double  distanceMeters,
        String  source,
        String  rawFileFormat
) {
    public static ActivityResponse from(ActivitySummary s) {
        return new ActivityResponse(
                s.id(), s.name(), s.sport(), s.startedAt(),
                s.durationSeconds(), s.distanceMeters(), s.source(), s.rawFileFormat());
    }
}
