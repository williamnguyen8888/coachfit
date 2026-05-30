package com.coachfit.subscription.application.port.in;

import java.time.Instant;
import java.util.UUID;

/**
 * Input port: subscription read surface.
 *
 * <pre>
 * GET /api/v1/subscription — returns the current user's subscription info
 * </pre>
 *
 * <p>Billing checkout ({@code POST /subscription/checkout}) and Stripe portal
 * are out of scope for this run (constraint: no billing checkout yet).
 */
public interface GetSubscriptionUseCase {

    SubscriptionInfo get(UUID userId);

    // ── Result type ──────────────────────────────────────────────────────────

    record SubscriptionInfo(
            String  tier,                  // free / pro / elite / coach
            String  status,                // active / cancelled / expired / trial
            Instant currentPeriodStart,    // nullable for free-tier users pre-checkout
            Instant currentPeriodEnd       // nullable
    ) {}
}
