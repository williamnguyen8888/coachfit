package com.coachfit.sync.adapter.in;

import com.coachfit.sync.application.port.in.SyncStravaWebhookUseCase;
import com.coachfit.sync.application.port.in.SyncStravaWebhookUseCase.StravaWebhookPayload;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * HTTP adapter for Strava webhook events.
 *
 * <pre>
 * GET  /api/v1/webhooks/strava  — Strava subscription challenge verification
 * POST /api/v1/webhooks/strava  — Strava activity event (create / update / delete)
 * </pre>
 *
 * <p>Both endpoints are public (no auth) — whitelisted in {@code SecurityConfig}.
 * The GET endpoint echoes the Strava challenge to complete subscription setup.
 * The POST endpoint enqueues a Redis job and returns 200 within &lt;2 seconds.
 *
 * <p>See docs/06-sync-engine-spec.md §Strava Webhook Processing.
 * See docs/05-api-design.md §Webhooks (Incoming).
 */
@RestController
@RequestMapping("/api/v1/webhooks/strava")
class StravaWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StravaWebhookController.class);

    private final SyncStravaWebhookUseCase webhookUseCase;

    StravaWebhookController(SyncStravaWebhookUseCase webhookUseCase) {
        this.webhookUseCase = webhookUseCase;
    }

    // ── GET /api/v1/webhooks/strava — Strava subscription verification ────────

    /**
     * Called once by Strava when a push subscription is being registered.
     *
     * <p>Strava sends:
     * {@code ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=random_string}
     *
     * <p>We must respond with {@code {"hub.challenge": "random_string"}} within 2 seconds
     * to confirm the subscription. Any non-200 or mismatched response fails the registration.
     */
    @GetMapping
    ResponseEntity<Map<String, String>> verify(
            @RequestParam(name = "hub.mode",         required = false) String hubMode,
            @RequestParam(name = "hub.verify_token", required = false) String hubVerifyToken,
            @RequestParam(name = "hub.challenge",    required = false) String hubChallenge) {

        String challenge = webhookUseCase.verify(hubMode, hubVerifyToken, hubChallenge);
        if (challenge == null) {
            log.warn("Strava webhook verification failed: mode={} token_present={}",
                    hubMode, hubVerifyToken != null);
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(Map.of("hub.challenge", challenge));
    }

    // ── POST /api/v1/webhooks/strava — incoming activity events ──────────────

    /**
     * Receives Strava webhook events (activity create / update / delete).
     *
     * <p>Must return 200 within &lt;2 seconds. All heavy processing is
     * delegated to the Redis queue worker. Non-activity events and
     * unknown athletes are silently acknowledged.
     */
    @PostMapping
    ResponseEntity<Void> receiveEvent(@RequestBody StravaEventDto body) {
        if (body == null) {
            log.warn("Strava webhook POST received empty body");
            return ResponseEntity.ok().build();  // Strava requires 200 even on bad events
        }

        StravaWebhookPayload payload = new StravaWebhookPayload(
                body.objectType(),
                body.aspectType(),
                body.objectId(),
                body.ownerId(),
                body.subscriptionId(),
                body.eventTime(),
                body.updates()
        );

        webhookUseCase.handleEvent(payload);
        return ResponseEntity.ok().build();
    }

    // ── Request DTO (Strava webhook POST body) ────────────────────────────────

    record StravaEventDto(
            @JsonProperty("object_type")     String            objectType,
            @JsonProperty("aspect_type")     String            aspectType,
            @JsonProperty("object_id")       Long              objectId,
            @JsonProperty("owner_id")        Long              ownerId,
            @JsonProperty("subscription_id") Long              subscriptionId,
            @JsonProperty("event_time")      Long              eventTime,
            @JsonProperty("updates")         Map<String, String> updates
    ) {}
}
