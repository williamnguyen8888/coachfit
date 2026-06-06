package com.coachfit.calendar.adapter.in.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Bulk delete request item. Either {@code id} or {@code external_id} may be supplied.
 */
public record AthleteEventDeleteRequest(
        String id,
        @JsonProperty("external_id") String externalId
) {}
