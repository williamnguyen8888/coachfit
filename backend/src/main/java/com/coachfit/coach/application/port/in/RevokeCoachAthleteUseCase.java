package com.coachfit.coach.application.port.in;

import java.util.UUID;

/**
 * Input port: revoke a coach-athlete relationship.
 *
 * <p>Either party may revoke at any time. Upon revocation:
 * <ul>
 *   <li>Status set to {@code revoked}</li>
 *   <li>{@code revoked_at} stamped with current time</li>
 *   <li>Coach loses access to athlete data immediately</li>
 * </ul>
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code DELETE /api/v1/coach/athletes/{athleteId}} — coach revokes</li>
 *   <li>{@code DELETE /api/v1/athlete/coach}              — athlete revokes</li>
 * </ul>
 */
public interface RevokeCoachAthleteUseCase {

    /**
     * Coach removes an athlete from their roster.
     *
     * @param coachId   authenticated coach
     * @param athleteId athlete to remove
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException if no active relationship
     */
    void revokeByCoach(UUID coachId, UUID athleteId);

    /**
     * Athlete removes their current coach.
     *
     * @param athleteId authenticated athlete
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException if no active coach
     */
    void revokeByAthlete(UUID athleteId);
}
