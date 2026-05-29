package com.coachfit.athlete.application.port.out;

import com.coachfit.athlete.domain.model.UserSummary;

import java.util.Optional;
import java.util.UUID;

/**
 * Output port for reading and partially updating the {@code users} table
 * within the athlete module.
 *
 * <p>Mirrors only what the athlete use cases need — avoids importing
 * {@code auth.application.port.out.UserPersistencePort} which would
 * break the {@code athlete -> shared} module boundary.
 */
public interface UserSummaryPersistencePort {

    Optional<UserSummary> findById(UUID userId);

    /**
     * Partially updates mutable user fields. {@code null} arguments are ignored.
     *
     * @param fullName nullable
     * @param settings nullable — raw JSON string
     */
    void updateUserFields(UUID userId, String fullName, String settings);
}
