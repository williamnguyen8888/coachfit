package com.coachfit.account.adapter.in.dto;

import java.time.Instant;
import java.util.List;

/**
 * Response for GET /api/v1/account/privacy.
 * Aggregates current privacy state and the consent log.
 * docs/11-privacy-compliance.md §9 API Endpoints Summary.
 */
public record AccountPrivacyResponse(
        boolean       processingRestricted,
        Instant       deletionScheduledAt,          // null if no pending deletion
        List<Consent> consents
) {
    public record Consent(
            String  type,
            boolean granted,
            Instant grantedAt,
            String  ipAddress,
            String  version
    ) {}
}
