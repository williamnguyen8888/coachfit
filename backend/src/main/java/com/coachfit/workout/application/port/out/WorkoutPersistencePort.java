package com.coachfit.workout.application.port.out;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: workout persistence.
 */
public interface WorkoutPersistencePort {

    UUID save(UUID userId, String name, String sport, String description,
              Integer estimatedDurationSeconds, BigDecimal estimatedTss,
              String stepsJson, String[] tags, boolean isTemplate,
              boolean isPublic, String source);

    Optional<WorkoutSummary> findById(UUID workoutId);

    List<WorkoutSummary> findByUserId(UUID userId);

    List<WorkoutSummary> findTemplates();

    void softDelete(UUID workoutId);

    // ── Read model ───────────────────────────────────────────────────────────

    record WorkoutSummary(
            UUID       id,
            UUID       userId,
            String     name,
            String     sport,
            String     stepsJson,
            boolean    isTemplate,
            boolean    isPublic,
            String     source
    ) {}
}
