package com.coachfit.workout.adapter.in.dto;

import com.coachfit.workout.application.port.in.ExportFitUseCase.FitExportResult;

/**
 * Response body for {@code GET /api/v1/workouts/{id}/export/fit}.
 *
 * @param downloadUrl pre-signed URL valid for 24 hours; the client should begin a file download
 * @param filename    suggested filename (e.g. {@code "Tempo_Intervals.fit"})
 */
public record FitExportResponse(
        String downloadUrl,
        String filename
) {

    public static FitExportResponse from(FitExportResult result) {
        return new FitExportResponse(result.downloadUrl(), result.filename());
    }
}
