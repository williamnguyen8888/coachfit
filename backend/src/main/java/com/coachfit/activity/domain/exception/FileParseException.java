package com.coachfit.activity.domain.exception;

/**
 * Thrown when a supported file format is detected but parsing fails
 * (e.g. corrupted FIT file, malformed XML).
 *
 * <p>Maps to HTTP 400 Bad Request in {@code ActivityExceptionHandler}.
 */
public class FileParseException extends RuntimeException {

    public FileParseException(String format, String reason) {
        super("Failed to parse " + format + " file: " + reason);
    }

    public FileParseException(String format, String reason, Throwable cause) {
        super("Failed to parse " + format + " file: " + reason, cause);
    }
}
