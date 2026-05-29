package com.coachfit.workout.adapter.in.dto;

import com.coachfit.workout.application.port.in.GetWorkoutUseCase.WorkoutDetail;
import com.fasterxml.jackson.annotation.JsonRawValue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for GET /api/v1/workouts/{id}.
 *
 * <p>{@code steps} is serialised with {@code @JsonRawValue} so the JSONB
 * string is embedded directly in the response without double-encoding.
 */
public record WorkoutDetailResponse(
        UUID       id,
        UUID       userId,
        String     name,
        String     sport,
        String     description,
        Integer    estimatedDurationSeconds,
        BigDecimal estimatedTss,

        @JsonRawValue
        String     steps,

        List<String> tags,
        boolean    isTemplate,
        boolean    isPublic,
        String     source,
        Instant    createdAt,
        Instant    updatedAt
) {

    public static WorkoutDetailResponse from(WorkoutDetail d) {
        return new WorkoutDetailResponse(
                d.id(), d.userId(), d.name(), d.sport(), d.description(),
                d.estimatedDurationSeconds(), d.estimatedTss(),
                d.stepsJson(),
                d.tags(), d.isTemplate(), d.isPublic(), d.source(),
                d.createdAt(), d.updatedAt()
        );
    }
}
