package com.coachfit.auth.domain.exception;

/** Thrown when a refresh token is expired, revoked, or not found in the DB. */
public class TokenExpiredException extends RuntimeException {
    public TokenExpiredException() {
        super("Refresh token is invalid or expired. Please log in again.");
    }
}
