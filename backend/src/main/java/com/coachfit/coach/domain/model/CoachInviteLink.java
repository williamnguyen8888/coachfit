package com.coachfit.coach.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain representation of a reusable coach invite link ({@code coach_invite_links}).
 *
 * <p>A coach can create multiple links with different policies (single-use vs. reusable,
 * optional expiry, optional max-use cap). Athletes use the public endpoint
 * {@code GET /join/{code}} to join via a link.
 */
public record CoachInviteLink(
        UUID    id,
        UUID    coachUserId,
        String  code,          // random 12-char alphanumeric, globally unique
        boolean isReusable,
        boolean isActive,
        Integer maxUses,       // nullable — null = unlimited
        int     usedCount,
        Instant expiresAt,     // nullable — null = never expires
        Instant createdAt
) {
    /**
     * Returns {@code true} if this link can still be used to create a new relationship.
     *
     * @param now current wall-clock time (passed in so domain logic stays pure)
     */
    public boolean isUsable(Instant now) {
        if (!isActive) return false;
        if (expiresAt != null && !now.isBefore(expiresAt)) return false;
        if (maxUses != null && usedCount >= maxUses) return false;
        return true;
    }
}
