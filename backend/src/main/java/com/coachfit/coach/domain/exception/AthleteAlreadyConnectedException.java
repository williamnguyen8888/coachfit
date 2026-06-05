package com.coachfit.coach.domain.exception;

/**
 * Thrown when a coach tries to invite an athlete that is already connected
 * (status = pending or active) to their roster.
 * Maps to HTTP 409 Conflict.
 */
public class AthleteAlreadyConnectedException extends RuntimeException {
    public AthleteAlreadyConnectedException(String message) {
        super(message);
    }
}
