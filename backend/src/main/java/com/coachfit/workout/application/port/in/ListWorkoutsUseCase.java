package com.coachfit.workout.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: list workouts in the authenticated user's library
 * (GET /api/v1/workouts).
 *
 * <p>Returns user-owned workouts plus any public system templates the user has
 * saved, ordered by newest first. Soft-deleted workouts are excluded.
 */
public interface ListWorkoutsUseCase {

    /**
     * Returns a page of the user's workouts.
     *
     * @param userId authenticated user
     * @param query  filter + pagination parameters
     * @return paged result
     */
    WorkoutPage list(UUID userId, WorkoutQuery query);

    // ── Query parameters ─────────────────────────────────────────────────────

    record WorkoutQuery(
            String sport,      // nullable — filter by sport
            Boolean isTemplate, // nullable — filter templates only / user workouts only
            int     page,
            int     size
    ) {}

    // ── Result types ─────────────────────────────────────────────────────────

    record WorkoutPage(
            List<WorkoutListItem> content,
            int  page,
            int  size,
            long totalElements,
            int  totalPages
    ) {}

    record WorkoutListItem(
            UUID       id,
            String     name,
            String     sport,
            String     description,
            Integer    estimatedDurationSeconds,
            BigDecimal estimatedTss,
            Double     estimatedDistance,
            Integer    averageIntensity,
            List<String> tags,
            boolean    isTemplate,
            boolean    isPublic,
            String     source,
            Instant    createdAt,
            Instant    updatedAt
    ) {}
}
