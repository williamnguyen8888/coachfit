package com.coachfit.workout.adapter.in.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.coachfit.workout.adapter.in.dto.RawJsonDeserializer;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for POST /api/v1/workouts and PUT /api/v1/workouts/{id}.
 *
 * <p>The {@code steps} field is deserialized as a raw JSON string so the
 * JSONB value can be passed directly to the validator and persisted without
 * intermediate object model conversion (FIT export compatibility is preserved).
 */
public record WorkoutRequest(
        String       name,
        String       sport,
        String       description,

        /** Raw JSON array of workout steps — stored verbatim in JSONB column. */
        @JsonDeserialize(using = RawJsonDeserializer.class)
        String       steps,

        List<String> tags,
        Boolean      isTemplate,
        Boolean      isPublic,
        Integer      estimatedDurationSeconds,
        BigDecimal   estimatedTss
) {}
