package com.coachfit.activity.adapter.in;

import com.coachfit.activity.domain.exception.DuplicateActivityException;
import com.coachfit.activity.domain.exception.FileParseException;
import com.coachfit.activity.domain.exception.UnsupportedFileFormatException;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Exception handler scoped to the activity module's inbound adapters.
 *
 * <p>Handles domain exceptions thrown during the upload pipeline and maps
 * them to the standard CoachFit error envelope
 * ({@code { "error": { "code": "...", "message": "..." } }}).
 *
 * <p>The 409 Duplicate response additionally includes an {@code existingId}
 * field as per docs/05-api-design.md §POST /activities/upload.
 */
@RestControllerAdvice(basePackages = "com.coachfit.activity.adapter.in")
class ActivityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ActivityExceptionHandler.class);

    @ExceptionHandler(DuplicateActivityException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateActivityException ex) {
        log.debug("Duplicate activity detected: {}", ex.getExistingActivityId());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", Map.of(
                        "code",       "DUPLICATE",
                        "message",    "Activity already exists",
                        "existingId", ex.getExistingActivityId().toString()
                )));
    }

    @ExceptionHandler(UnsupportedFileFormatException.class)
    public ResponseEntity<ApiErrorResponse> handleUnsupportedFormat(UnsupportedFileFormatException ex) {
        log.debug("Unsupported file format: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(new ApiError("UNSUPPORTED_FORMAT", ex.getMessage())));
    }

    @ExceptionHandler(FileParseException.class)
    public ResponseEntity<ApiErrorResponse> handleParseError(FileParseException ex) {
        log.warn("File parse error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(new ApiError("PARSE_ERROR", ex.getMessage())));
    }
}
