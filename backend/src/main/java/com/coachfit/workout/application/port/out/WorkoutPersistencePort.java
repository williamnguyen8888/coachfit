package com.coachfit.workout.application.port.out;

import com.coachfit.workout.application.port.in.GetWorkoutUseCase.WorkoutDetail;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase.WorkoutListItem;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase.TemplateListItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: workout record persistence (the {@code workouts} table).
 *
 * <p>All write methods are transactional; the adapter implements
 * {@code @Transactional} on mutating methods.
 */
public interface WorkoutPersistencePort {

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Persists a new workout row and returns the generated UUID.
     *
     * @param userId                   owner (null for system templates)
     * @param name                     workout name
     * @param sport                    sport type
     * @param description              optional description
     * @param stepsJson                validated JSON for the steps JSONB column
     * @param tags                     optional tags list
     * @param isTemplate               whether this is a template
     * @param isPublic                 whether publicly visible
     * @param source                   source label (user / system / coach / import)
     * @param estimatedDurationSeconds optional pre-computed duration
     * @param estimatedTss             optional estimated TSS
     * @return generated workout UUID
     */
    UUID save(UUID userId,
              String name,
              String sport,
              String description,
              String stepsJson,
              List<String> tags,
              boolean isTemplate,
              boolean isPublic,
              String source,
              Integer estimatedDurationSeconds,
              BigDecimal estimatedTss);

    /**
     * Fully replaces editable fields on an existing workout.
     *
     * @param workoutId target row
     * @param userId    owner — used in WHERE clause for safety
     * @return true if the row was found and updated
     */
    boolean update(UUID workoutId,
                   UUID userId,
                   String name,
                   String sport,
                   String description,
                   String stepsJson,
                   List<String> tags,
                   boolean isTemplate,
                   boolean isPublic,
                   Integer estimatedDurationSeconds,
                   BigDecimal estimatedTss);

    /**
     * Soft-deletes a workout owned by the user (sets {@code deleted_at = now()}).
     *
     * @param workoutId target row
     * @param userId    owner — used in WHERE clause for safety
     * @return true if the row was found and deleted
     */
    boolean softDelete(UUID workoutId, UUID userId);

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Full detail view used by GET /workouts/{id}.
     *
     * <p>Returns empty if the workout is deleted or inaccessible to the user.
     * A workout is accessible if:
     * <ul>
     *   <li>it belongs to the user ({@code user_id = userId}), OR</li>
     *   <li>it is a system template ({@code user_id IS NULL}) and not deleted</li>
     * </ul>
     */
    Optional<WorkoutDetail> findDetailById(UUID userId, UUID workoutId);

    /**
     * Paginated list of a user's own workouts (non-deleted).
     */
    List<WorkoutListItem> list(UUID userId, String sport, Boolean isTemplate,
                               int page, int size);

    /** Total count matching the list filters. */
    long count(UUID userId, String sport, Boolean isTemplate);

    /**
     * Paginated list of public/system templates (non-deleted).
     * Returns workouts where is_template=true AND (user_id IS NULL OR is_public=true).
     */
    List<TemplateListItem> listTemplates(String sport, int page, int size);

    /** Total count of public/system templates. */
    long countTemplates(String sport);
}
