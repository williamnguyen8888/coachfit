package com.coachfit.workout.application.port.in;

import java.util.UUID;

/**
 * Input port: export a workout as a Garmin .FIT file.
 *
 * <p>Implements {@code GET /api/v1/workouts/{id}/export/fit} (💎 Pro tier).
 *
 * <p>The implementation:
 * <ol>
 *   <li>Loads the workout (enforcing ownership).</li>
 *   <li>Loads the requesting user's sport zones (for relative-target resolution).</li>
 *   <li>Encodes the workout into binary .FIT format.</li>
 *   <li>Stores the .FIT file in MinIO {@code workout-exports} bucket.</li>
 *   <li>Returns a pre-signed 24-hour download URL.</li>
 * </ol>
 *
 * @throws org.springframework.web.server.ResponseStatusException 404 if the workout is not found
 */
public interface ExportFitUseCase {

    /**
     * Generates a FIT export for the given workout and returns a time-limited download URL.
     *
     * @param userId    authenticated user requesting the export
     * @param workoutId workout to export
     * @return export result containing a pre-signed download URL valid for 24 hours
     */
    FitExportResult exportFit(UUID userId, UUID workoutId);

    // ── Result type ───────────────────────────────────────────────────────────

    /**
     * Result of a successful FIT export.
     *
     * @param downloadUrl pre-signed URL valid for 24 hours
     * @param objectKey   MinIO object key of the stored file
     * @param filename    suggested filename for the client (e.g. {@code "Tempo_Intervals.fit"})
     */
    record FitExportResult(String downloadUrl, String objectKey, String filename) {}
}
