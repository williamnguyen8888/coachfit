package com.coachfit.subscription.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.subscription.application.port.in.GetSubscriptionUseCase;
import com.coachfit.subscription.application.port.in.GetSubscriptionUseCase.SubscriptionInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the subscription read surface.
 *
 * <pre>
 * GET /api/v1/subscription — returns tier, status, and billing period dates
 * </pre>
 *
 * <p>Billing checkout endpoints ({@code POST /subscription/checkout},
 * {@code POST /subscription/portal}) are excluded from this run per the
 * task constraint: "Do not expand into billing checkout yet."
 */
@RestController
@RequestMapping("/api/v1/subscription")
public class SubscriptionController {

    private final GetSubscriptionUseCase subscriptionUseCase;

    public SubscriptionController(GetSubscriptionUseCase subscriptionUseCase) {
        this.subscriptionUseCase = subscriptionUseCase;
    }

    /**
     * Returns the current subscription for the authenticated user.
     * Free users without a checkout row receive a synthetic free/active response.
     */
    @GetMapping
    public ResponseEntity<SubscriptionInfo> getSubscription(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(subscriptionUseCase.get(principal.getUserId()));
    }
}
