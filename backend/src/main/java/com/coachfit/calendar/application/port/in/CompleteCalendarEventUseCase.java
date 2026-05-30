package com.coachfit.calendar.application.port.in;

import java.util.UUID;

/**
 * Input port: manually mark a calendar event as completed.
 * (PUT /api/v1/calendar/{id}/complete)
 *
 * <p>State transitions allowed:
 * <ul>
 *   <li>{@code partial} → {@code completed} (manual override)</li>
 * </ul>
 *
 * <p>Note: the primary completion path (activity linking) is handled internally
 * when an activity is linked to a calendar event. This endpoint is for manual
 * override from {@code partial} status.
 */
public interface CompleteCalendarEventUseCase {

    /**
     * Transitions a {@code partial} event to {@code completed}.
     * Throws 404 if the event does not exist or belongs to another user.
     * Throws 409 if the current state does not allow the transition.
     *
     * @param userId  authenticated user (owner or coach)
     * @param eventId target event
     */
    void complete(UUID userId, UUID eventId);
}
