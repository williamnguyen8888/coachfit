package com.coachfit.calendar.adapter.in.dto;

/**
 * Request body for PUT /api/v1/calendar/{id}/skip.
 *
 * <p>When {@code unskip} is {@code true} the operation transitions
 * a skipped event back to planned. Defaults to {@code false}.
 */
public record SkipRequest(boolean unskip) {}
