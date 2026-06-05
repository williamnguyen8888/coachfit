package com.coachfit.coach.application.port.in;

import com.coachfit.coach.domain.model.CoachAthlete;

import java.util.UUID;

/**
 * Input port: athlete-side view of their current coach relationship.
 *
 * <p>Endpoint: {@code GET /api/v1/athlete/coach}
 */
public interface GetAthleteCoachInfoUseCase {

    /**
     * Returns the active coach relationship for the given athlete, or {@code null} if none.
     *
     * @param athleteId authenticated athlete
     */
    CoachAthlete getCoachInfo(UUID athleteId);
}
