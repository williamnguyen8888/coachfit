package com.coachfit.activity.domain.exception;

import java.util.UUID;

/**
 * Thrown when an uploaded file matches an activity that already exists
 * for the user (fingerprint-based deduplication).
 *
 * <p>Maps to HTTP 409 Conflict in {@code ActivityExceptionHandler}.
 */
public class DuplicateActivityException extends RuntimeException {

    private final UUID existingActivityId;

    public DuplicateActivityException(UUID existingActivityId) {
        super("Activity already exists: " + existingActivityId);
        this.existingActivityId = existingActivityId;
    }

    public UUID getExistingActivityId() {
        return existingActivityId;
    }
}
