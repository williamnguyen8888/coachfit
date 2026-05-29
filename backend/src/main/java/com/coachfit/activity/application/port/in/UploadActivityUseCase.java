package com.coachfit.activity.application.port.in;

import java.time.Instant;
import java.util.UUID;

/**
 * Input port: upload and ingest a raw activity file (FIT / TCX / GPX).
 *
 * <p>The returned {@link ActivitySummary} is serialised directly as the HTTP 201 body.
 */
public interface UploadActivityUseCase {

    /**
     * Processes an uploaded activity file end-to-end:
     * store → detect → parse → dedup → normalise → persist.
     *
     * @param userId           authenticated user's UUID
     * @param originalFilename original filename from the multipart upload
     * @param fileBytes        raw file bytes
     * @return summary of the newly created activity
     * @throws com.coachfit.activity.domain.exception.DuplicateActivityException if a matching activity exists
     * @throws com.coachfit.activity.domain.exception.UnsupportedFileFormatException if format is unrecognised
     * @throws com.coachfit.activity.domain.exception.FileParseException if parsing fails
     */
    ActivitySummary upload(UUID userId, String originalFilename, byte[] fileBytes);

    /**
     * Lightweight read model returned to the HTTP layer after a successful upload.
     *
     * @param id              activity UUID
     * @param name            activity name
     * @param sport           sport type string
     * @param startedAt       UTC timestamp of activity start
     * @param durationSeconds total elapsed time
     * @param distanceMeters  total distance (nullable)
     * @param source          always "manual" for file uploads
     * @param rawFileFormat   "fit", "tcx", or "gpx"
     */
    record ActivitySummary(
            UUID    id,
            String  name,
            String  sport,
            Instant startedAt,
            int     durationSeconds,
            Double  distanceMeters,
            String  source,
            String  rawFileFormat
    ) {}
}
