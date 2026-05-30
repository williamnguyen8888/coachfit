package com.coachfit.apikey.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: API Key management.
 *
 * <pre>
 * GET    /api/v1/api-keys        — list all keys (no raw key in list)
 * POST   /api/v1/api-keys        — create key (raw key returned ONCE)
 * DELETE /api/v1/api-keys/{id}   — revoke (is_active = false)
 * </pre>
 *
 * <p>Key format: {@code cf_live_} + 32-char secure random hex.
 * Storage: SHA-256(rawKey). Raw key visible only in {@link CreatedKey#rawKey()}.
 */
public interface ApiKeyUseCase {

    List<ApiKeyInfo> listKeys(UUID userId);

    CreatedKey createKey(UUID userId, String name, Instant expiresAt);

    void revokeKey(UUID userId, UUID keyId);

    // ── Result types ─────────────────────────────────────────────────────────

    /**
     * Safe representation — never contains the raw key.
     */
    record ApiKeyInfo(
            UUID    id,
            String  name,
            String  keyPrefix,
            boolean isActive,
            Instant lastUsedAt,
            Instant expiresAt,
            Instant createdAt
    ) {}

    /**
     * Returned only once at creation time. Contains the plain-text raw key.
     */
    record CreatedKey(
            UUID    id,
            String  name,
            String  keyPrefix,
            String  rawKey,       // shown ONCE — never stored, never logged
            Instant expiresAt,
            Instant createdAt
    ) {}
}
