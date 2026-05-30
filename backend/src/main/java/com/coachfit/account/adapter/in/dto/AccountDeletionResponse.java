package com.coachfit.account.adapter.in.dto;

import java.time.Instant;

/**
 * Response for DELETE /api/v1/account — 200 OK.
 * Per docs/11-privacy-compliance.md §8: "Return 200 {message, deletionDate}".
 */
public record AccountDeletionResponse(
        String  message,
        Instant deletionDate
) {}
