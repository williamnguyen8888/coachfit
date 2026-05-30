package com.coachfit.calendar.application.port.in;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input port: update a calendar event.
 * (PUT /api/v1/calendar/{id})
 *
 * <p>Updates mutable fields (date, title, description, workoutId).
 * Status transitions are handled by dedicated use cases (complete, skip).
 */
public interface UpdateCalendarEventUseCase {

    /**
     * Updates an existing calendar event.
     * Throws 404 if the event does not exist or belongs to another user.
     *
     * @param userId  authenticated owner
     * @param eventId target event
     * @param command updated fields
     */
    void update(UUID userId, UUID eventId, UpdateCommand command);

    // ── Command ────────────────────────────────────────────────────────────────

    record UpdateCommand(
            LocalDate date,         // required
            String    eventType,    // required
            String    title,        // required
            String    description,  // optional
            UUID      workoutId     // optional
    ) {}
}
