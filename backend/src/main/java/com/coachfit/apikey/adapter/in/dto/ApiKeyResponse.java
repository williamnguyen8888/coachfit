package com.coachfit.apikey.adapter.in.dto;

import com.coachfit.apikey.application.port.in.ApiKeyUseCase.ApiKeyInfo;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for listing API keys — does NOT include the raw key.
 */
public record ApiKeyResponse(
        UUID    id,
        String  name,
        String  keyPrefix,
        boolean isActive,
        Instant lastUsedAt,
        Instant expiresAt,
        Instant createdAt
) {
    public static ApiKeyResponse from(ApiKeyInfo info) {
        return new ApiKeyResponse(info.id(), info.name(), info.keyPrefix(),
                info.isActive(), info.lastUsedAt(), info.expiresAt(), info.createdAt());
    }
}
