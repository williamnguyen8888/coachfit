package com.coachfit.calendar.application.port.in;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: list calendar events within a date range.
 * (GET /api/v1/calendar?from=...&to=...)
 *
 * <p>Returns a flat list — no pagination — as per the API spec:
 * "number of events in a range (usually 1 month) is always small."
 */
public interface ListCalendarEventsUseCase {

    /**
     * Returns all non-deleted calendar events for the user in [from, to] (inclusive).
     *
     * @param userId authenticated user
     * @param from   start date (inclusive)
     * @param to     end date (inclusive)
     * @return ordered list of calendar event read models
     */
    List<CalendarEventView> list(UUID userId, LocalDate from, LocalDate to);

    // ── Read model ─────────────────────────────────────────────────────────────

    record WorkoutSummary(UUID id, String sport, Integer estimatedDurationSeconds, java.math.BigDecimal estimatedTss, Double estimatedDistance) {}
    record ActivitySummary(UUID id, Double tss, Integer durationSeconds) {}

    record CalendarEventView(
            UUID            id,
            LocalDate       date,
            String          eventType,
            String          title,
            String          description,
            String          status,
            short           orderIndex,
            java.math.BigDecimal complianceScore,
            WorkoutSummary  workout,    // nullable
            ActivitySummary activity    // nullable
    ) {}
}
