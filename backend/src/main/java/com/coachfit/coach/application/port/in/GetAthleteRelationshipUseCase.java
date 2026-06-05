package com.coachfit.coach.application.port.in;

import com.coachfit.coach.domain.model.CoachAthlete;

import java.util.UUID;

/**
 * Input port: get the relationship details for a specific coach-athlete pair.
 *
 * <p>Used by {@code GET /api/v1/coach/athletes/{athleteId}} and by the athlete-side
 * {@code GET /api/v1/athlete/coach} to fetch relationship metadata.
 */
public interface GetAthleteRelationshipUseCase {

    /**
     * Loads the relationship as seen by the coach.
     *
     * @param coachId   authenticated coach
     * @param athleteId the athlete to look up
     * @return the relationship record
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException if not found
     */
    CoachAthlete getRelationshipAsCoach(UUID coachId, UUID athleteId);

    /**
     * Loads the relationship as seen by the athlete.
     *
     * @param athleteId authenticated athlete
     * @return the active relationship record (null if no coach)
     */
    CoachAthlete getRelationshipAsAthlete(UUID athleteId);
}
