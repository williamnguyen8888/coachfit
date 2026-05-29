package com.coachfit.workout.application.port.in;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Input port: update an existing workout
 * (PUT /api/v1/workouts/{id}).
 *
 * <p>Only the owning user may update a workout. System templates
 * (user_id IS NULL) may not be mutated through this use case.
 */
public interface UpdateWorkoutUseCase {

    /**
     * Applies a full replacement update to the workout.
     *
     * @param userId    authenticated user (must own the workout)
     * @param workoutId workout to update
     * @param command   new field values
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / owned by another user
     */
    void update(UUID userId, UUID workoutId, UpdateCommand command);

    // ── Command ───────────────────────────────────────────────────────────────

    record UpdateCommand(
            String       name,
            String       sport,
            String       description,
            String       stepsJson,                // validated JSON
            List<String> tags,
            boolean      isTemplate,
            boolean      isPublic,
            Integer      estimatedDurationSeconds,
            BigDecimal   estimatedTss
    ) {}
}
