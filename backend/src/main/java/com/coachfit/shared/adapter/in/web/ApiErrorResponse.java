package com.coachfit.shared.adapter.in.web;

/**
 * Top-level API error response envelope.
 *
 * <p>Every error response from the CoachFit API uses this shape (docs/05-api-design.md):
 * <pre>
 * { "error": { "code": "NOT_FOUND", "message": "..." } }
 * </pre>
 *
 * @param error the inner error detail
 */
public record ApiErrorResponse(ApiError error) {}
