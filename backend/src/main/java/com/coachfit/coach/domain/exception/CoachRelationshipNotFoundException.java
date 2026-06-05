package com.coachfit.coach.domain.exception;

/** Thrown when the target coach-athlete relationship does not exist or is inaccessible. */
public class CoachRelationshipNotFoundException extends RuntimeException {
    public CoachRelationshipNotFoundException(String message) {
        super(message);
    }
}
