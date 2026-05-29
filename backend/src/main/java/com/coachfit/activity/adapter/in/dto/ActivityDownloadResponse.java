package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.DownloadActivityUseCase.DownloadInfo;

/**
 * HTTP response body for {@code GET /api/v1/activities/{id}/download} (200 OK).
 *
 * <p>The pre-signed URL is valid for {@code expiresInSeconds} seconds.
 */
public record ActivityDownloadResponse(
        String url,
        String format,
        int    expiresInSeconds
) {
    public static ActivityDownloadResponse from(DownloadInfo info) {
        return new ActivityDownloadResponse(info.url(), info.format(), info.expiresInSeconds());
    }
}
