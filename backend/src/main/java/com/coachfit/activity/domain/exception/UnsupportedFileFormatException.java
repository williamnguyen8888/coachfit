package com.coachfit.activity.domain.exception;

/**
 * Thrown when an uploaded file's format cannot be identified as FIT, TCX, or GPX.
 *
 * <p>Maps to HTTP 400 Bad Request in {@code ActivityExceptionHandler}.
 */
public class UnsupportedFileFormatException extends RuntimeException {

    public UnsupportedFileFormatException(String filename) {
        super("Unsupported file format: " + filename +
              ". Supported formats are: .fit, .tcx, .gpx");
    }
}
