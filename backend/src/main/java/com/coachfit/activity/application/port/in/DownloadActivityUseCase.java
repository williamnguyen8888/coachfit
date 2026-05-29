package com.coachfit.activity.application.port.in;

import java.util.UUID;

/**
 * Input port: generate a pre-signed download URL for the original raw file
 * (GET /api/v1/activities/{id}/download).
 *
 * <p>The activity must have a stored raw file ({@code raw_file_path} is not null).
 * If no raw file exists the controller returns 404.
 */
public interface DownloadActivityUseCase {

    /**
     * Generates a short-lived pre-signed URL for downloading the original file.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId target activity
     * @return download info including the pre-signed URL and file metadata
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / no raw file
     * @throws org.springframework.security.access.AccessDeniedException if owned by another user
     */
    DownloadInfo getDownloadUrl(UUID userId, UUID activityId);

    // ── Result type ───────────────────────────────────────────────────────────

    record DownloadInfo(
            String url,           // pre-signed URL (expires in presignedUrlExpirySeconds)
            String format,        // "fit", "tcx", or "gpx"
            int    expiresInSeconds
    ) {}
}
