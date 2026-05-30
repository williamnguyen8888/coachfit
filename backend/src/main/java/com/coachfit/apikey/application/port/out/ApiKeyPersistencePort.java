package com.coachfit.apikey.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: API key persistence.
 *
 * <p>Used by:
 * <ul>
 *   <li>{@code ApiKeyService} — management operations</li>
 *   <li>{@code ApiKeyAuthenticationFilter} — authentication lookup by hash</li>
 * </ul>
 */
public interface ApiKeyPersistencePort {

    UUID save(UUID userId, String keyHash, String keyPrefix, String name, Instant expiresAt);

    List<ApiKeyRow> findAllByUserId(UUID userId);

    /**
     * Looks up an active, non-expired API key by its SHA-256 hash.
     * Used by the authentication filter on every request bearing a {@code cf_live_*} token.
     */
    Optional<ApiKeyRow> findActiveByKeyHash(String keyHash);

    void revoke(UUID keyId);

    /** Updates {@code last_used_at = now()} for the given key. */
    void touchLastUsed(UUID keyId);

    // ── Read model ───────────────────────────────────────────────────────────

    record ApiKeyRow(
            UUID    id,
            UUID    userId,
            String  keyHash,
            String  keyPrefix,
            String  name,
            boolean isActive,
            Instant lastUsedAt,
            Instant expiresAt,
            Instant createdAt
    ) {}
}
