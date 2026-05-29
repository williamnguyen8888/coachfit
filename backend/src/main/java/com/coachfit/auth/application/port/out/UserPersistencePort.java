package com.coachfit.auth.application.port.out;

import com.coachfit.auth.domain.model.AuthUser;

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
}
