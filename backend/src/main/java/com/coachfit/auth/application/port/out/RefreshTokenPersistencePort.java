package com.coachfit.auth.application.port.out;

import com.coachfit.auth.domain.model.RefreshToken;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: refresh token persistence operations.
 *
 * <p>Only the SHA-256 hash of the raw token is stored; the raw token is returned
 * once via an httpOnly cookie and never persisted.
 */
public interface RefreshTokenPersistencePort {

    void create(UUID userId, String tokenHash, Instant expiresAt);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Revokes a single token (sets revoked_at = now). Idempotent. */
    void revokeByTokenHash(String tokenHash);

    /** Revokes ALL tokens for a user (full logout / account compromise). */
    void revokeAllForUser(UUID userId);
}
