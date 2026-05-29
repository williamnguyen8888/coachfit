package com.coachfit.auth.domain.exception;

/**
 * Thrown when login credentials are wrong (user not found OR password mismatch).
 *
 * <p>Deliberately uses a single exception for both cases — callers receive the same
 * error message regardless of which check failed, preventing user-enumeration attacks.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("Invalid email or password.");
    }
}
