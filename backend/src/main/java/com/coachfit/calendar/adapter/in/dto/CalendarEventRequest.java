package com.coachfit.calendar.adapter.in.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Request body for POST /api/v1/calendar and PUT /api/v1/calendar/{id}.
 *
 * <p>{@code eventType} must be one of: {@code workout}, {@code note}, {@code race}, {@code rest}.
 * {@code workoutId} is only meaningful when {@code eventType = "workout"}.
 */
public record CalendarEventRequest(
        LocalDate date,
        String    eventType,
        String    title,
        String    description,
        UUID      workoutId
) {}
