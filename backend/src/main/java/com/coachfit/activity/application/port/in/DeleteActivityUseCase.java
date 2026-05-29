package com.coachfit.activity.application.port.in;

import java.util.UUID;

/**
 * Input port: soft-delete an activity
 * (DELETE /api/v1/activities/{id}).
 */
public interface DeleteActivityUseCase {

    /**
     * Soft-deletes an activity owned by the authenticated user.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId activity to delete
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / already deleted
     * @throws org.springframework.security.access.AccessDeniedException if owned by another user
     */
    void delete(UUID userId, UUID activityId);
}
