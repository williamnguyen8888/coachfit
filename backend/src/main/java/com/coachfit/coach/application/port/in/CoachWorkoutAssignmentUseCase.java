package com.coachfit.coach.application.port.in;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: coach workout assignment use cases.
 *
 * <p>Covers:
 * <ul>
 *   <li>{@code POST /coach/athletes/{id}/calendar} — assign a single workout</li>
 *   <li>{@code PUT  /coach/athletes/{id}/calendar/{eventId}} — update assigned event</li>
 *   <li>{@code DELETE /coach/athletes/{id}/calendar/{eventId}} — remove assigned event</li>
 *   <li>{@code POST /coach/athletes/{id}/workouts} — push workout to athlete library</li>
 *   <li>{@code POST /coach/athletes/bulk-assign} — assign to multiple athletes</li>
 * </ul>
 */
public interface CoachWorkoutAssignmentUseCase {

    /**
     * Assigns a workout from the coach's library to an athlete's calendar.
     *
     * @return the newly created calendar event ID
     */
    AssignResult assign(UUID coachId, UUID athleteId, AssignCommand command);

    /**
     * Updates notes / date of an already-assigned calendar event.
     */
    void update(UUID coachId, UUID athleteId, UUID eventId, UpdateAssignCommand command);

    /**
     * Removes (soft-deletes) an assigned calendar event from the athlete's calendar.
     */
    void remove(UUID coachId, UUID athleteId, UUID eventId);

    /**
     * Adds a workout from the coach's library directly into the athlete's workout library.
     */
    UUID addWorkoutToAthleteLibrary(UUID coachId, UUID athleteId, UUID workoutId);

    /**
     * Assigns the same workout to multiple athletes on the same date (bulk assign).
     *
     * @return number of successfully created events
     */
    BulkAssignResult bulkAssign(UUID coachId, BulkAssignCommand command);

    // ── Command / result types ────────────────────────────────────────────────

    record AssignCommand(
            UUID      workoutId,
            LocalDate date,
            String    notes        // optional coach notes shown on the calendar event
    ) {}

    record UpdateAssignCommand(
            LocalDate date,
            String    notes
    ) {}

    record AssignResult(
            UUID   eventId,
            String date,
            String title,
            String status,
            String assignedBy
    ) {}

    record BulkAssignCommand(
            List<UUID> athleteIds,
            UUID       workoutId,
            LocalDate  date,
            String     notes
    ) {}

    record BulkAssignResult(int created, int failed) {}
}
