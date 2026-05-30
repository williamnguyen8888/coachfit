package com.coachfit.apikey.adapter.in.dto;

import com.coachfit.apikey.application.port.in.ApiKeyUseCase.CreatedKey;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for POST /api/v1/api-keys.
 *
 * <p>This is the <strong>only</strong> response that includes {@code rawKey}.
 * The client must store it immediately — it cannot be retrieved again.
 */
public record ApiKeyCreatedResponse(
        UUID    id,
        String  name,
        String  keyPrefix,
        String  rawKey,      // ← shown ONCE
        Instant expiresAt,
        Instant createdAt
) {
    public static ApiKeyCreatedResponse from(CreatedKey key) {
        return new ApiKeyCreatedResponse(
                key.id(), key.name(), key.keyPrefix(),
                key.rawKey(), key.expiresAt(), key.createdAt());
    }
}
