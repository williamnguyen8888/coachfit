package com.coachfit.apikey.adapter.in.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Request body for POST /api/v1/api-keys.
 */
public record CreateApiKeyRequest(
        @Size(max = 100) String name,
        Instant expiresAt   // nullable — omit for non-expiring key
) {}
