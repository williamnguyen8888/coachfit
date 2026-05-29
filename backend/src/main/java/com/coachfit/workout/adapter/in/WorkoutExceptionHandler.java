package com.coachfit.workout.adapter.in;

import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import com.coachfit.workout.domain.WorkoutValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Exception handler scoped to the workout module's inbound adapters.
 *
 * <p>Maps domain exceptions thrown during workout creation / update to the
 * standard CoachFit error envelope
 * ({@code { "error": { "code": "...", "message": "..." } }}).
 */
@RestControllerAdvice(basePackages = "com.coachfit.workout.adapter.in")
class WorkoutExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(WorkoutExceptionHandler.class);

    /**
     * Maps {@link WorkoutValidationException} → 400 Bad Request.
     *
     * <p>Thrown by {@link com.coachfit.workout.domain.WorkoutStepsValidator}
     * when the {@code steps} JSON fails structural validation against the
     * rules in docs/07-workout-data-model.md.
     */
    @ExceptionHandler(WorkoutValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(WorkoutValidationException ex) {
        log.debug("Workout validation failed: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(new ApiError("INVALID_WORKOUT", ex.getMessage())));
    }
}
