package com.coachfit.athlete.adapter.in;

import com.coachfit.athlete.domain.exception.ProviderNotFoundException;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Exception handler scoped to the athlete module.
 *
 * <p>Maps domain exceptions to structured API responses following the
 * {@code { "error": { "code": "...", "message": "..." } }} envelope
 * (docs/05-api-design.md §Conventions).
 */
@RestControllerAdvice(assignableTypes = AthleteController.class)
class AthleteExceptionHandler {

    @ExceptionHandler(ProviderNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleProviderNotFound(ProviderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }
}
