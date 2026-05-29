package com.coachfit.auth.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: API key persistence.
 *
 * <p>Raw keys are never passed through this port.
 * Callers must hash the key before calling {@link #create}.
 */
public interface ApiKeyPersistencePort {

    /**
     * Persists a new API key (hash only).
     *
     * @param keyHash   SHA-256(rawKey) in hex
     * @param keyPrefix display prefix (first 8 chars)
     * @return the generated key UUID
     */
    UUID create(UUID userId, String keyHash, String keyPrefix, String name, Instant expiresAt);

    /**
     * Looks up an active key by hash. Updates {@code last_used_at} as a side effect.
     */
    Optional<ApiKeySummary> findActiveByHash(String keyHash);

    void revoke(UUID keyId);

    // ── Read model ───────────────────────────────────────────────────────────

    record ApiKeySummary(UUID id, UUID userId, String keyPrefix, String name,
                         Instant expiresAt, boolean isActive) {}
}
