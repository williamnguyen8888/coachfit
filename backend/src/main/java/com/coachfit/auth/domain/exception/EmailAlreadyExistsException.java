package com.coachfit.auth.domain.exception;

/** Thrown when a registration attempt uses an email that already exists. */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("Email already registered: " + email);
    }
}
