package com.coachfit.athlete.adapter.in.dto;

import java.time.Instant;

/**
 * Response DTO for {@code GET /athlete/connections}.
 *
 * <p>Token fields are deliberately excluded — only metadata is surfaced.
 */
public record ConnectionResponse(
        String  provider,
        String  syncStatus,
        Instant lastSyncAt,
        boolean pushEnabled,
        Instant connectedAt
) {}
