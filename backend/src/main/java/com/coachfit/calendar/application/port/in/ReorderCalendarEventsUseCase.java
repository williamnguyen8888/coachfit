package com.coachfit.calendar.application.port.in;

import java.util.List;
import java.util.UUID;

/**
 * Input port: reorder calendar events on the same day.
 * (POST /api/v1/calendar/reorder)
 *
 * <p>The client sends an ordered list of event IDs for a given date.
 * The service assigns {@code order_index} values (0, 1, 2, ...) in the
 * order received. All events must belong to the same user.
 */
public interface ReorderCalendarEventsUseCase {

    /**
     * Reassigns {@code order_index} for the provided events in sequence.
     * Any event not owned by {@code userId} is silently skipped (security guard).
     *
     * @param userId   authenticated user
     * @param eventIds ordered list of event IDs (0-based position = new orderIndex)
     */
    void reorder(UUID userId, List<UUID> eventIds);
}
