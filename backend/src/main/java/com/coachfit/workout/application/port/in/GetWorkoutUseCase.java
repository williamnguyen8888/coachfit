package com.coachfit.workout.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: get the full detail of a single workout
 * (GET /api/v1/workouts/{id}).
 *
 * <p>Ownership is enforced: the user must own the workout, or the workout
 * must be a public system template (user_id IS NULL).
 */
public interface GetWorkoutUseCase {

    /**
     * Loads the full detail of a workout.
     *
     * @param userId    authenticated user
     * @param workoutId requested workout UUID
     * @return full workout detail including steps JSONB
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found or deleted
     */
    WorkoutDetail get(UUID userId, UUID workoutId);

    // ── Result type ───────────────────────────────────────────────────────────

    record WorkoutDetail(
            UUID       id,
            UUID       userId,
            String     name,
            String     sport,
            String     description,
            Integer    estimatedDurationSeconds,
            BigDecimal estimatedTss,
            String     stepsJson,   // raw JSONB — serialised as-is to client
            List<String> tags,
            boolean    isTemplate,
            boolean    isPublic,
            String     source,
            Instant    createdAt,
            Instant    updatedAt
    ) {}
}
