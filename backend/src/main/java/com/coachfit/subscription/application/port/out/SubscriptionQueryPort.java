package com.coachfit.subscription.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: subscription read queries.
 */
public interface SubscriptionQueryPort {

    Optional<SubscriptionRow> findByUserId(UUID userId);

    // ── Row type ──────────────────────────────────────────────────────────────

    record SubscriptionRow(
            UUID    id,
            String  tier,
            String  status,
            Instant currentPeriodStart,
            Instant currentPeriodEnd
    ) {}
}
