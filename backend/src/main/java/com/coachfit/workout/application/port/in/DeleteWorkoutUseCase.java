package com.coachfit.workout.application.port.in;

import java.util.UUID;

/**
 * Input port: soft-delete a workout
 * (DELETE /api/v1/workouts/{id}).
 *
 * <p>Sets {@code deleted_at = now()} on the workout row. Only the owning user
 * may delete their workout. System templates (user_id IS NULL) cannot be deleted
 * through this endpoint.
 */
public interface DeleteWorkoutUseCase {

    /**
     * Soft-deletes the workout.
     *
     * @param userId    authenticated user (must own the workout)
     * @param workoutId workout to delete
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / owned by another user
     */
    void delete(UUID userId, UUID workoutId);
}
