package com.coachfit.coach.domain.exception;

/**
 * Thrown when an invite token is expired, already used, or not found.
 * Maps to HTTP 400 Bad Request.
 */
public class InviteTokenExpiredException extends RuntimeException {
    public InviteTokenExpiredException(String message) {
        super(message);
    }
}
