package com.coachfit.coach.application.port.in;

import java.util.UUID;

/**
 * Input port: accept a coach invite via a shareable link code.
 *
 * <p>Flow (docs/08-auth-model.md §Invite Flow — Option B):
 * <ol>
 *   <li>Athlete opens {@code GET /join/{code}}</li>
 *   <li>If not authenticated → redirect to login with redirect-back URL</li>
 *   <li>Service looks up {@code coach_invite_links} by code</li>
 *   <li>Validates: isActive, not expired, usedCount &lt; maxUses (if limited)</li>
 *   <li>Creates or activates a {@code coach_athletes} row (status=active)</li>
 *   <li>Increments {@code used_count} on the link</li>
 * </ol>
 */
public interface AcceptInviteLinkUseCase {

    /**
     * Joins a coach roster via a shareable link code.
     *
     * @param athleteId authenticated athlete
     * @param code      the 12-char link code from the URL
     * @throws com.coachfit.coach.domain.exception.InviteTokenExpiredException
     *         if the link is inactive, expired, or exhausted
     * @throws com.coachfit.coach.domain.exception.AthleteAlreadyConnectedException
     *         if athlete already has an active relationship with this coach
     */
    void acceptLink(UUID athleteId, String code);
}
