package com.coachfit.calendar.application.port.in;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input port: create a new calendar event.
 * (POST /api/v1/calendar)
 *
 * <p>New events always start in {@code planned} status.
 */
public interface CreateCalendarEventUseCase {

    /**
     * Creates a calendar event for the user.
     *
     * @param userId  authenticated owner
     * @param command event fields
     * @return the generated calendar event UUID
     */
    UUID create(UUID userId, CreateCommand command);

    // ── Command ────────────────────────────────────────────────────────────────

    record CreateCommand(
            LocalDate date,         // required
            String    eventType,    // workout / note / race / rest
            String    title,        // required
            String    description,  // optional
            UUID      workoutId     // optional — only relevant when eventType=workout
    ) {}
}
