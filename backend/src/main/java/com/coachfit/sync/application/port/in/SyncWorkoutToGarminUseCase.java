package com.coachfit.sync.application.port.in;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Input port: push a planned workout from CoachFit to the user's Garmin Connect calendar.
 *
 * <p>When a calendar event with an attached workout is synced to Garmin:
 * <ol>
 *   <li>The workout definition is created/updated in Garmin Training API</li>
 *   <li>The workout is scheduled on the user's Garmin Connect calendar for the planned date</li>
 *   <li>The {@code garmin_workout_id} and {@code garmin_scheduled_id} are stored back
 *       on the {@code calendar_events} row for future update/delete</li>
 * </ol>
 *
 * <p>Prerequisites:
 * <ul>
 *   <li>User must have an active Garmin OAuth connection ({@code oauth_connections} row)</li>
 *   <li>The calendar event must have an associated {@code workout_id}</li>
 *   <li>CoachFit must have Garmin Training API access approved</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Training API Integration.
 */
public interface SyncWorkoutToGarminUseCase {

    /**
     * Pushes a calendar event's workout to Garmin Connect and schedules it for the event date.
     *
     * @param calendarEventId CoachFit calendar event UUID (must have a workout_id)
     * @param userId          CoachFit user UUID (must have an active Garmin connection)
     * @return result containing Garmin IDs stored on the calendar event
     * @throws GarminSyncException if the user has no Garmin connection, the event has no workout,
     *                             or the Garmin Training API call fails
     */
    SyncResult syncToGarmin(UUID calendarEventId, UUID userId);

    /**
     * Removes a previously synced workout from the user's Garmin Connect calendar.
     *
     * <p>No-op if the calendar event has no Garmin IDs (was never synced).
     *
     * @param calendarEventId CoachFit calendar event UUID
     * @param userId          CoachFit user UUID
     */
    void removeFromGarmin(UUID calendarEventId, UUID userId);

    /**
     * Result of a successful sync operation.
     *
     * @param garminWorkoutId   Garmin Training API workout definition ID
     * @param garminScheduledId Garmin Training API schedule ID
     * @param scheduledDate     date the workout was scheduled on Garmin Connect
     */
    record SyncResult(
            String    garminWorkoutId,
            String    garminScheduledId,
            LocalDate scheduledDate
    ) {}

    /**
     * Exception thrown when Garmin sync pre-conditions are not met.
     */
    class GarminSyncException extends RuntimeException {
        public GarminSyncException(String message) { super(message); }
    }

    /**
     * Query port: minimal data needed from a calendar event for Garmin sync.
     */
    record CalendarEventGarminView(
            UUID          eventId,
            UUID          workoutId,       // null if event has no workout
            LocalDate     plannedDate,
            Optional<String> garminWorkoutId,    // empty if never synced
            Optional<String> garminScheduledId   // empty if never synced
    ) {}
}
