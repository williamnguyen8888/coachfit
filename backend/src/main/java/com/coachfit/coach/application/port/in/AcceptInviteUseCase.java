package com.coachfit.coach.application.port.in;

import java.util.UUID;

/**
 * Input port: accept an email-based coach invite via the signed JWT token.
 *
 * <p>Flow (docs/08-auth-model.md §Invite Flow — Option A):
 * <ol>
 *   <li>Athlete clicks link in email → {@code GET /api/v1/coach/invites/{token}/accept}</li>
 *   <li>Service validates JWT (signature + 7d expiry)</li>
 *   <li>Finds the pending {@code coach_athletes} record by token</li>
 *   <li>Sets status = 'active', accepted_at = now()</li>
 *   <li>Notifies the coach</li>
 * </ol>
 */
public interface AcceptInviteUseCase {

    /**
     * Accepts a pending email invite.
     *
     * @param athleteId authenticated athlete accepting the invite
     * @param token     the JWT token extracted from the invite URL path segment
     * @throws com.coachfit.coach.domain.exception.InviteTokenExpiredException if token is invalid/expired
     */
    void accept(UUID athleteId, String token);
}
