package com.coachfit.coach.domain.exception;

/**
 * Thrown when a coach has reached the maximum allowed athlete count for their tier.
 * Maps to HTTP 403 Forbidden.
 *
 * <p>Default limit: 20 athletes for the Coach tier (docs/08-auth-model.md §Athlete Limit per Coach).
 */
public class AthleteCapacityExceededException extends RuntimeException {
    private final int limit;

    public AthleteCapacityExceededException(int limit) {
        super("Coach roster is full (max " + limit + " athletes)");
        this.limit = limit;
    }

    public int getLimit() { return limit; }
}
