package com.coachfit.account.adapter.in.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response for GET /api/v1/account/export — 202 Accepted.
 * The export is asynchronous; client should poll or wait for the in-app notification.
 */
public record ExportJobResponse(
        UUID    jobId,
        String  status,
        Instant createdAt,
        Instant expiresAt,
        String  message
) {}
