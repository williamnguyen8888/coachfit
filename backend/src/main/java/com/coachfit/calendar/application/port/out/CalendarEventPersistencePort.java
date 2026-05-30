package com.coachfit.calendar.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: calendar event persistence.
 *
 * <p>All write operations that take a {@code userId} enforce ownership so
 * a user can never mutate another user's events.
 */
public interface CalendarEventPersistencePort {

    // ── Writes ─────────────────────────────────────────────────────────────────

    UUID save(UUID userId, LocalDate date, String eventType,
              UUID workoutId, String title, String description);

    /**
     * Updates mutable fields of an existing (non-deleted) event.
     *
     * @return {@code true} if a row was updated; {@code false} if not found / wrong owner
     */
    boolean update(UUID eventId, UUID userId, LocalDate date, String eventType,
                   String title, String description, UUID workoutId);

    /**
     * Transitions the event's status if the event exists and belongs to the user.
     *
     * @return {@code true} if the status was changed; {@code false} if not found / wrong owner
     */
    boolean updateStatus(UUID eventId, UUID userId, String newStatus);

    /**
     * Links a completed activity to an event and sets compliance score.
     * Also transitions status to 'completed' (or 'partial' if score < 50).
     */
    void linkActivity(UUID eventId, UUID activityId, BigDecimal complianceScore);

    /**
     * Reassigns {@code order_index} values in batch.
     * Each entry: (eventId, newOrderIndex). Only updates rows owned by userId.
     */
    void reorder(UUID userId, List<ReorderEntry> entries);

    void softDelete(UUID eventId);

    // ── Reads ──────────────────────────────────────────────────────────────────

    Optional<CalendarEventSummary> findById(UUID eventId);

    List<CalendarEventSummary> findByUserAndDateRange(UUID userId, LocalDate from, LocalDate to);

    /**
     * Auto-skip: find all planned events with date < today and mark them skipped.
     * Called by the nightly scheduler.
     */
    int autoSkipPastPlanned();

    // ── Read model ─────────────────────────────────────────────────────────────

    record CalendarEventSummary(
            UUID         id,
            UUID         userId,
            LocalDate    date,
            String       eventType,
            UUID         workoutId,
            UUID         activityId,
            String       title,
            String       description,
            String       status,
            short        orderIndex,
            BigDecimal   complianceScore,
            String       workoutSport,
            Integer      workoutDuration,
            BigDecimal   activityTss,
            Integer      activityDuration
    ) {}

    record ReorderEntry(UUID eventId, short newOrderIndex) {}
}
