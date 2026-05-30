package com.coachfit.account.adapter.in.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for PUT /api/v1/account/restrict.
 * docs/11-privacy-compliance.md §3.5 — Right to Restrict Processing.
 */
public record AccountRestrictionRequest(
        @NotNull Boolean restricted
) {}
