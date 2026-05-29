package com.coachfit.sync.application.port.in;

import java.util.Map;

/**
 * Use case port for handling Strava webhook events.
 *
 * <p>Two operations are exposed:
 * <ol>
 *   <li><b>verify</b> — called by Strava during webhook subscription setup
 *       ({@code GET /api/v1/webhooks/strava?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...})</li>
 *   <li><b>handleEvent</b> — called for each activity event
 *       ({@code POST /api/v1/webhooks/strava}).
 *       Must return within &lt;2 seconds (push job to Redis, return 200).</li>
 * </ol>
 *
 * <p>See docs/06-sync-engine-spec.md §Strava Webhook Processing.
 */
public interface SyncStravaWebhookUseCase {

    /**
     * Validates the Strava verification request and returns the challenge string.
     *
     * @param hubMode        must equal "subscribe"
     * @param hubVerifyToken must match {@code app.providers.strava.webhook-verify-token}
     * @param hubChallenge   arbitrary string Strava expects echoed back
     * @return the challenge string to echo, or {@code null} if verification fails
     */
    String verify(String hubMode, String hubVerifyToken, String hubChallenge);

    /**
     * Handles an incoming Strava webhook event.
     *
     * <p>Per the spec, only {@code object_type=activity} events with
     * {@code aspect_type in (create, update)} trigger a sync job.
     * All other events (e.g. athlete updates) are acknowledged with 200 and ignored.
     *
     * @param payload raw deserialized webhook payload
     */
    void handleEvent(StravaWebhookPayload payload);

    // ── Payload DTO ───────────────────────────────────────────────────────────

    /**
     * Maps the Strava webhook POST body.
     * <pre>
     * {
     *   "object_type":     "activity",
     *   "aspect_type":     "create",
     *   "object_id":       12345678,
     *   "owner_id":        67890,
     *   "subscription_id": 999,
     *   "event_time":      1234567890,
     *   "updates":         {}
     * }
     * </pre>
     */
    record StravaWebhookPayload(
            String            objectType,
            String            aspectType,
            Long              objectId,        // Strava activity/athlete ID
            Long              ownerId,         // Strava athlete ID
            Long              subscriptionId,
            Long              eventTime,
            Map<String, String> updates        // present on "update" events
    ) {}
}
