package com.coachfit.athlete.domain.model;

import java.util.UUID;

/**
 * Minimal user identity projection used by the athlete module.
 *
 * <p>Intentionally duplicates only what the athlete API needs from the
 * {@code users} table — avoids importing {@code auth.domain.model.AuthUser}
 * and thereby keeps the module boundary {@code athlete -> shared} intact.
 */
public record UserSummary(
        UUID   id,
        String email,
        String fullName,
        String role,
        String tier,
        String settings
) {}
