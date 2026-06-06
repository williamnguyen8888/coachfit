package com.coachfit.calendar.adapter.in.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Request body for the external athlete events API.
 *
 * <p>Field names intentionally accept Intervals.icu-style snake_case payloads.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AthleteEventRequest(
        String category,
        @JsonProperty("start_date_local") String startDateLocal,
        LocalDate date,
        String name,
        String description,
        String type,
        @JsonProperty("moving_time") Integer movingTime,
        @JsonProperty("time_target") Integer timeTarget,
        @JsonProperty("icu_training_load") BigDecimal icuTrainingLoad,
        @JsonProperty("load_target") BigDecimal loadTarget,
        BigDecimal distance,
        @JsonProperty("distance_target") BigDecimal distanceTarget,
        List<String> tags,
        @JsonProperty("workout_id") UUID workoutId,
        String uid,
        @JsonProperty("external_id") String externalId,
        String filename,
        @JsonProperty("file_contents") String fileContents,
        @JsonProperty("file_contents_base64") String fileContentsBase64,
        JsonNode steps,
        JsonNode workout,
        @JsonProperty("workout_doc") JsonNode workoutDoc
) {}
