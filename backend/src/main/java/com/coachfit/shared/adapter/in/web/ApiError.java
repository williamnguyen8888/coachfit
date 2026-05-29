package com.coachfit.shared.adapter.in.web;

/**
 * Inner error detail for the standard CoachFit API error envelope.
 *
 * <p>Matches the error format defined in docs/05-api-design.md:
 * <pre>
 * { "error": { "code": "NOT_FOUND", "message": "..." } }
 * </pre>
 *
 * @param code    machine-readable error code (e.g. {@code NOT_FOUND}, {@code UPGRADE_REQUIRED})
 * @param message human-readable description safe to display to API consumers
 */
public record ApiError(String code, String message) {}
