package com.coachfit.coach.application.port.in;

import java.util.List;
import java.util.UUID;

/**
 * Input port: update the coach's metadata (nickname, tags, notes) for an athlete.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code PUT /api/v1/coach/athletes/{athleteId}/nickname}</li>
 *   <li>{@code PUT /api/v1/coach/athletes/{athleteId}/tags}</li>
 *   <li>{@code PUT /api/v1/coach/athletes/{athleteId}/notes}</li>
 * </ul>
 *
 * <p>Any field left {@code null} in the command is treated as "no change"
 * (partial update semantics).
 */
public interface UpdateAthleteMetaUseCase {

    /**
     * @param coachId   authenticated coach
     * @param athleteId athlete whose metadata is being updated
     * @param cmd       partial update — null fields are ignored
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException
     *         if no active relationship exists
     */
    void updateMeta(UUID coachId, UUID athleteId, UpdateMetaCommand cmd);

    record UpdateMetaCommand(
            String       nickname,  // nullable
            String       notes,     // nullable
            List<String> tags       // nullable
    ) {}
}
