package com.coachfit.sync.application.port.out;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: integration with the Garmin Training API.
 *
 * <p>The Garmin Training API (separate program from Health API) allows platforms
 * to push structured workouts directly to a user's Garmin Connect calendar.
 * When the user next syncs their device, the workout is downloaded automatically.
 *
 * <p>Authentication uses OAuth 1.0a with the same consumer key/secret as the
 * Health API, but requires a Training API access approval separately.
 *
 * <p>API base URL: {@code https://apis.garmin.com/training-api/}
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Training API Integration.
 */
public interface GarminTrainingPort {

    /**
     * Creates or updates a workout definition on Garmin Connect.
     *
     * <p>Calls {@code POST /training-api/workout} with the workout payload.
     * If the workout already has a {@code garminWorkoutId}, calls
     * {@code PUT /training-api/workout/{id}} to update it.
     *
     * @param userId         CoachFit user UUID (used to look up OAuth tokens)
     * @param workoutPayload Garmin Training API workout JSON
     * @param existingId     existing Garmin workout ID to update, or empty to create new
     * @return Garmin-assigned workout ID (to be stored in calendar_events)
     * @throws GarminTrainingException if the user has no active Garmin connection,
     *                                 or the API call fails
     */
    String upsertWorkout(UUID userId, String workoutPayload, Optional<String> existingId);

    /**
     * Schedules a workout on the user's Garmin Connect calendar for a specific date.
     *
     * <p>Calls {@code POST /training-api/workout/{workoutId}/schedule}.
     *
     * @param userId        CoachFit user UUID
     * @param garminWorkoutId Garmin workout definition ID (from {@link #upsertWorkout})
     * @param date          the date to schedule the workout
     * @return Garmin-assigned schedule ID (to be stored in calendar_events)
     */
    String scheduleWorkout(UUID userId, String garminWorkoutId, LocalDate date);

    /**
     * Removes a scheduled workout from the user's Garmin Connect calendar.
     *
     * <p>Calls {@code DELETE /training-api/workout/{workoutId}/schedule/{scheduleId}}.
     *
     * @param userId          CoachFit user UUID
     * @param garminWorkoutId Garmin workout definition ID
     * @param garminScheduleId Garmin schedule ID (from {@link #scheduleWorkout})
     */
    void deleteSchedule(UUID userId, String garminWorkoutId, String garminScheduleId);

    /**
     * Deletes a workout definition from Garmin Connect (also removes all scheduled instances).
     *
     * <p>Calls {@code DELETE /training-api/workout/{workoutId}}.
     *
     * @param userId          CoachFit user UUID
     * @param garminWorkoutId Garmin workout definition ID
     */
    void deleteWorkout(UUID userId, String garminWorkoutId);

    /**
     * Exception thrown when Garmin Training API calls fail.
     */
    class GarminTrainingException extends RuntimeException {
        private final int httpStatus;

        public GarminTrainingException(String message, int httpStatus) {
            super(message);
            this.httpStatus = httpStatus;
        }

        public GarminTrainingException(String message, Throwable cause) {
            super(message, cause);
            this.httpStatus = 0;
        }

        public int getHttpStatus() { return httpStatus; }
    }
}
