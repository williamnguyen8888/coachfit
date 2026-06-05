package com.coachfit.coach.application.port.in;

import java.util.Map;
import java.util.UUID;

/**
 * Input port: athlete updates the permission flags for their current coach.
 *
 * <p>Endpoint: {@code PUT /api/v1/athlete/coach/permissions}
 *
 * <p>Expects a partial map of {@code {permission: true|false}} entries.
 * Unknown keys are ignored; unspecified keys retain their current value.
 *
 * @see com.coachfit.coach.domain.model.CoachPermissions
 */
public interface UpdateCoachPermissionsUseCase {

    /**
     * Applies the given permission deltas to the athlete's active coach relationship.
     *
     * @param athleteId   authenticated athlete
     * @param permissions map of permission key → desired boolean value
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException if no active coach
     */
    void updatePermissions(UUID athleteId, Map<String, Boolean> permissions);
}
