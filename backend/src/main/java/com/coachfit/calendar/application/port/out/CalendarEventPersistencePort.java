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
     * Unlinks an activity from an event, resetting status to 'planned'.
     */
    void unlinkActivity(UUID eventId);

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
     * Finds planned uncompleted workout events for a user on a specific date.
     */
    List<CalendarEventSummary> findPlannedWorkoutsByDate(UUID userId, LocalDate date);

    /**
     * Finds the user's timezone from their settings, defaulting to Asia/Ho_Chi_Minh or UTC.
     */
    String findUserTimezone(UUID userId);

    /**
     * Auto-skip: find all planned events with date < today and mark them skipped.
     * Called by the nightly scheduler.
     */
    int autoSkipPastPlanned();

    /**
     * Finds duration and sport details of an activity.
     */
    Optional<SimpleActivityDetails> findActivityDetails(UUID activityId);

    record SimpleActivityDetails(Integer durationSeconds, String sport) {}

    record SimpleActivityDetailsWithId(UUID id, int durationSeconds, String sport) {}

    void createStandaloneActivityEvent(UUID userId, LocalDate date, UUID activityId, String name, String sport);

    Optional<SimpleActivityDetailsWithId> findUnmatchedActivityOnDate(UUID userId, LocalDate date, String sport);

    void deleteStandaloneEventForActivity(UUID activityId);

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
            BigDecimal   workoutTss,
            String       workoutSteps,
            BigDecimal   activityTss,
            Integer      activityDuration,
            String       activitySport,
            String       activityName,
            BigDecimal   activityDistance,
            Integer      activityAvgHr,
            Integer      activityMaxHr,
            Integer      activityAvgPower,
            String       activitySource
    ) {}

    record ReorderEntry(UUID eventId, short newOrderIndex) {}
}
