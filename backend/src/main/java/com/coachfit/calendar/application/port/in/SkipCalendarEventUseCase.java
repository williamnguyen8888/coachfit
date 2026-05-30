package com.coachfit.calendar.application.port.in;

import java.util.UUID;

/**
 * Input port: mark a calendar event as skipped.
 * (PUT /api/v1/calendar/{id}/skip)
 *
 * <p>State transitions allowed:
 * <ul>
 *   <li>{@code planned} → {@code skipped} (user/coach explicit skip)</li>
 *   <li>{@code skipped} → {@code planned} (user un-skips / reschedules — body: {@code unskip:true})</li>
 * </ul>
 */
public interface SkipCalendarEventUseCase {

    /**
     * Marks a {@code planned} event as {@code skipped}, or un-skips back to {@code planned}.
     * Throws 404 if the event does not exist or belongs to another user.
     * Throws 409 if the current state does not permit the transition.
     *
     * @param userId  authenticated user (owner or coach)
     * @param eventId target event
     * @param unskip  when {@code true}, transitions {@code skipped} → {@code planned}
     */
    void skip(UUID userId, UUID eventId, boolean unskip);
}
