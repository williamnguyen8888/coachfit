package com.coachfit.workout.domain;

/**
 * Thrown when a workout's {@code steps} JSON fails structural validation.
 *
 * <p>Caught by {@link com.coachfit.workout.adapter.in.WorkoutExceptionHandler}
 * and mapped to HTTP 400 Bad Request.
 */
public class WorkoutValidationException extends RuntimeException {

    public WorkoutValidationException(String message) {
        super(message);
    }
}
