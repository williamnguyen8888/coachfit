package com.coachfit.auth.domain.model;

import java.util.UUID;

/**
 * Core domain representation of an authenticated user.
 *
 * <p>Carries only the data needed by the auth module. The {@code tier} field
 * is loaded from the {@code subscriptions} table by the persistence adapter so
 * that JWT claims are always up-to-date.
 *
 * <p>Deliberately excludes {@code passwordHash} — the persistence port exposes
 * a dedicated {@code findPasswordHashByEmail()} method to keep the hash out of
 * general-purpose domain objects.
 */
public record AuthUser(
        UUID   id,
        String email,
        String fullName,
        String role,   // athlete | coach | admin
        String tier    // free | pro | elite | coach
) {}
