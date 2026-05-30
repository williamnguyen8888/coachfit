package com.coachfit.calendar.application.port.in;

import java.util.UUID;

/**
 * Input port: delete a calendar event.
 * (DELETE /api/v1/calendar/{id})
 *
 * <p>Soft-deletes the event (sets {@code deleted_at}).
 */
public interface DeleteCalendarEventUseCase {

    /**
     * Soft-deletes a calendar event.
     * Throws 404 if the event does not exist or belongs to another user.
     *
     * @param userId  authenticated owner
     * @param eventId target event
     */
    void delete(UUID userId, UUID eventId);
}
