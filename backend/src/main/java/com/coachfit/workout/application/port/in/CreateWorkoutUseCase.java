package com.coachfit.workout.application.port.in;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Input port: create a new workout
 * (POST /api/v1/workouts).
 *
 * <p>The {@code steps} field is accepted as a raw JSON string and stored as JSONB.
 * Structural validation is performed by {@code WorkoutStepsValidator} before
 * the use case is invoked.
 */
public interface CreateWorkoutUseCase {

    /**
     * Creates a new workout in the user's library.
     *
     * @param userId  authenticated owner
     * @param command all required workout fields
     * @return the generated workout UUID
     */
    UUID create(UUID userId, CreateCommand command);

    // ── Command ───────────────────────────────────────────────────────────────

    record CreateCommand(
            String       name,                      // required, max 255 chars
            String       sport,                     // required
            String       description,               // optional
            String       stepsJson,                 // required JSON string (validated)
            List<String> tags,                      // optional
            boolean      isTemplate,
            boolean      isPublic,
            Integer      estimatedDurationSeconds,  // auto-calculated if absent
            BigDecimal   estimatedTss               // optional
    ) {}
}
