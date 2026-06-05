package com.coachfit.coach.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Domain representation of a coach-athlete relationship row ({@code coach_athletes}).
 *
 * <p>Lifecycle: {@code pending → active → revoked | expired}
 * <ul>
 *   <li>{@code pending}  — invite sent, awaiting athlete acceptance</li>
 *   <li>{@code active}   — athlete accepted; coach has access per {@link #permissions()}</li>
 *   <li>{@code revoked}  — either party explicitly revoked the relationship</li>
 *   <li>{@code expired}  — coach downgraded away from Coach tier</li>
 * </ul>
 *
 * <p>Deliberately a pure data record — no Spring, no JPA.
 */
public record CoachAthlete(
        UUID             id,
        UUID             coachUserId,
        UUID             athleteUserId,
        String           status,        // pending / active / revoked / expired
        String           inviteType,    // email / link / manual  (nullable)
        String           inviteToken,   // encrypted JWT token for email invites  (nullable)
        String           inviteCode,    // shareable link code  (nullable)
        CoachPermissions permissions,
        String           nickname,      // coach's custom label  (nullable)
        String           notes,         // coach's private notes  (nullable)
        List<String>     tags,
        Instant          invitedAt,
        Instant          acceptedAt,    // nullable
        Instant          revokedAt,     // nullable
        Instant          createdAt,
        Instant          updatedAt
) {
    /** Convenience: is this relationship currently allowing coach access? */
    public boolean isActive() {
        return "active".equals(status);
    }
}
