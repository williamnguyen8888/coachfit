package com.coachfit.account.adapter.in.dto;

/**
 * Response for POST /api/v1/account/cancel-deletion — 200 OK.
 */
public record CancelDeletionResponse(
        String  message,
        boolean restored
) {}
