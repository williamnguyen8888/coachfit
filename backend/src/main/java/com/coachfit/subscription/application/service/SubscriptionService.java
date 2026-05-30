package com.coachfit.subscription.application.service;

import com.coachfit.subscription.application.port.in.GetSubscriptionUseCase;
import com.coachfit.subscription.application.port.out.SubscriptionQueryPort;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Application service implementing {@link GetSubscriptionUseCase}.
 *
 * <p>If no subscription row exists (pre-checkout free user), returns a synthetic
 * free/active subscription so the client always gets a valid response.
 */
@Service
public class SubscriptionService implements GetSubscriptionUseCase {

    private final SubscriptionQueryPort queryPort;

    public SubscriptionService(SubscriptionQueryPort queryPort) {
        this.queryPort = queryPort;
    }

    @Override
    public SubscriptionInfo get(UUID userId) {
        return queryPort.findByUserId(userId)
                .map(row -> new SubscriptionInfo(
                        row.tier(),
                        row.status(),
                        row.currentPeriodStart(),
                        row.currentPeriodEnd()))
                // Free users who have never gone through checkout may have no row yet.
                .orElseGet(() -> new SubscriptionInfo("free", "active", null, null));
    }
}
