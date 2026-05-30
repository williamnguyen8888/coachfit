package com.coachfit.auth.application.port.out;

import com.coachfit.auth.domain.model.AuthUser;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: user persistence operations needed by the auth module.
 *
 * <p>Password hash is intentionally excluded from {@link AuthUser} — use
 * {@link #findPasswordHashByEmail} only for credential verification.
 */
public interface UserPersistencePort {

    boolean existsByEmail(String email);

    Optional<AuthUser> findByEmail(String email);

    Optional<AuthUser> findById(UUID id);

    /** Returns the BCrypt hash for login verification only. Never put this in a response. */
    Optional<String> findPasswordHashByEmail(String email);

    /**
     * Creates a new user and initialises a free subscription.
     *
     * @param passwordHash BCrypt hash, or {@code null} for OAuth-only accounts
     */
    AuthUser createUser(String email, String fullName, String passwordHash);

    /**
     * Partially updates mutable user fields. {@code null} arguments are ignored (not overwritten).
     *
     * <p>Used by the athlete module to patch {@code users.full_name} and
     * {@code users.settings} without importing the auth JPA entity.
     *
     * @param fullName nullable — updates {@code full_name} if non-null
     * @param settings nullable — raw JSON string, updates {@code settings} if non-null
     */
    void updateUserFields(UUID userId, String fullName, String settings);

    // ── Account lifecycle (GDPR — docs/11-privacy-compliance.md §8) ─────────

    /**
     * Soft-deletes the user by setting {@code deleted_at = now()}.
     * Hard delete happens after the 30-day grace period via scheduled job.
     */
    void softDelete(UUID userId);

    /**
     * Cancels a pending deletion by clearing {@code deleted_at}.
     * Note: OAuth tokens revoked on deletion are NOT automatically restored.
     *
     * @return {@code true} if a pending deletion was found and cancelled; {@code false} otherwise
     */
    boolean cancelDeletion(UUID userId);

    /** Returns the {@code deleted_at} timestamp if the user is pending deletion. */
    Optional<Instant> getDeletedAt(UUID userId);

    // ── Processing restriction (GDPR Art. 18 — Right to Restrict Processing) ─

    /**
     * Sets or clears the {@code processing_restricted} flag.
     * When {@code true}, all sync jobs and webhook processing must be paused for this user.
     */
    void setProcessingRestricted(UUID userId, boolean restricted);

    /** Returns {@code true} if data processing is currently restricted for this user. */
    boolean isProcessingRestricted(UUID userId);
}

