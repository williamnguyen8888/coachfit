package com.coachfit.coach.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: invite an athlete to a coach's roster by email.
 *
 * <p>Flow (docs/08-auth-model.md §Invite Flow — Option A):
 * <ol>
 *   <li>Coach calls {@code POST /api/v1/coach/athletes/invite}</li>
 *   <li>Service creates {@code coach_athletes} row (status=pending)</li>
 *   <li>Signs a 7-day JWT invite token and stores it encrypted in the row</li>
 *   <li>Sends the invite email via {@code CoachEmailPort}</li>
 * </ol>
 *
 * <p>Idempotency: duplicate invite to the same email while a pending/active record
 * exists throws {@link com.coachfit.coach.domain.exception.AthleteAlreadyConnectedException}.
 *
 * <p>Requires idempotency key ({@code Idempotency-Key} header) to prevent double-sends on retry
 * (docs/05-api-design.md §Idempotency).
 */
public interface InviteAthleteUseCase {

    /**
     * Creates a pending invite.
     *
     * @param coachId authenticated coach's user ID
     * @param cmd     invite parameters
     * @return reference to the newly created relationship
     */
    CoachAthleteRef invite(UUID coachId, InviteCommand cmd);

    record InviteCommand(
            String       email,
            String       nickname,   // nullable
            List<String> tags        // nullable
    ) {}

    record CoachAthleteRef(
            UUID    id,
            String  status,
            Instant invitedAt
    ) {}
}
