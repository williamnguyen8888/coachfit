package com.coachfit.calendar.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: calendar event persistence.
 */
public interface CalendarEventPersistencePort {

    UUID save(UUID userId, LocalDate date, String eventType,
              UUID workoutId, String title, String description);

    Optional<CalendarEventSummary> findById(UUID eventId);

    List<CalendarEventSummary> findByUserAndDateRange(UUID userId, LocalDate from, LocalDate to);

    /**
     * Links a completed activity to an event and sets compliance score.
     */
    void linkActivity(UUID eventId, UUID activityId, BigDecimal complianceScore);

    void softDelete(UUID eventId);

    // ── Read model ───────────────────────────────────────────────────────────

    record CalendarEventSummary(
            UUID       id,
            UUID       userId,
            LocalDate  date,
            String     eventType,
            UUID       workoutId,
            UUID       activityId,
            String     title,
            String     status,
            short      orderIndex,
            BigDecimal complianceScore
    ) {}
}
