package com.coachfit.sync.application.service;

import com.coachfit.auth.adapter.in.StravaOAuthProperties;
import com.coachfit.sync.application.port.in.SyncStravaWebhookUseCase;
import com.coachfit.sync.application.port.out.StravaJobQueuePort;
import com.coachfit.sync.application.port.out.StravaTokenPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Implements the fast path of the Strava webhook lifecycle:
 * <ol>
 *   <li>Webhook subscription verification (GET)</li>
 *   <li>Event receipt + Redis enqueue (POST) — must return &lt;2s</li>
 * </ol>
 *
 * <p>All heavy processing (token refresh, API fetch, persistence) is delegated
 * to {@link StravaActivitySyncService} via the async queue worker.
 *
 * <p>See docs/06-sync-engine-spec.md §Strava Webhook Processing.
 */
@Service
public class StravaWebhookService implements SyncStravaWebhookUseCase {

    private static final Logger log = LoggerFactory.getLogger(StravaWebhookService.class);

    private final StravaOAuthProperties stravaProperties;
    private final StravaTokenPort       stravaTokenPort;
    private final StravaJobQueuePort    jobQueuePort;

    public StravaWebhookService(StravaOAuthProperties stravaProperties,
                                StravaTokenPort stravaTokenPort,
                                StravaJobQueuePort jobQueuePort) {
        this.stravaProperties = stravaProperties;
        this.stravaTokenPort  = stravaTokenPort;
        this.jobQueuePort     = jobQueuePort;
    }

    // ── SyncStravaWebhookUseCase ──────────────────────────────────────────────

    /**
     * Verifies Strava's subscription challenge.
     *
     * <p>Strava sends:
     * {@code GET /webhooks/strava?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...}
     *
     * @return the challenge string to echo, or {@code null} if verification fails
     */
    @Override
    public String verify(String hubMode, String hubVerifyToken, String hubChallenge) {
        if (!"subscribe".equals(hubMode)) {
            log.warn("Strava webhook verify: unexpected hub.mode={}", hubMode);
            return null;
        }

        String expected = stravaProperties.webhookVerifyToken();
        if (expected == null || expected.isBlank() || !expected.equals(hubVerifyToken)) {
            log.warn("Strava webhook verify: token mismatch (expected configured token)");
            return null;
        }

        log.info("Strava webhook subscription verified, returning challenge");
        return hubChallenge;
    }

    /**
     * Handles an incoming Strava webhook event.
     *
     * <p>Only {@code object_type=activity} events with
     * {@code aspect_type in (create, update, delete)} trigger downstream processing.
     * All other events are acknowledged silently (200).
     *
     * <p>Per spec: must return &lt;2s — only Redis enqueue happens synchronously.
     */
    @Override
    public void handleEvent(StravaWebhookPayload payload) {
        if (payload == null) {
            log.warn("Strava webhook received null payload");
            return;
        }

        // Only handle activity events
        if (!"activity".equals(payload.objectType())) {
            log.debug("Strava webhook ignoring non-activity event: objectType={}", payload.objectType());
            return;
        }

        String aspectType = payload.aspectType();
        if (!"create".equals(aspectType) && !"update".equals(aspectType) && !"delete".equals(aspectType)) {
            log.debug("Strava webhook ignoring aspect_type={}", aspectType);
            return;
        }

        // Look up CoachFit user from Strava athlete ID
        String stravaAthleteId = String.valueOf(payload.ownerId());
        Optional<UUID> userId = stravaTokenPort.findUserByStravaAthleteId(stravaAthleteId);
        if (userId.isEmpty()) {
            log.warn("Strava webhook received event for unknown athlete: owner_id={}", payload.ownerId());
            // Return 200 — spec says: "invalid user → return 200, log warning, no retry"
            return;
        }

        String stravaActivityId = String.valueOf(payload.objectId());
        String eventType = switch (aspectType) {
            case "create" -> "activity_created";
            case "update" -> "activity_updated";
            case "delete" -> "activity_deleted";
            default       -> aspectType;
        };

        // Push job to Redis Stream and return immediately
        jobQueuePort.enqueue(userId.get(), stravaActivityId, eventType, 0);
        log.info("Strava webhook queued: userId={} activityId={} eventType={}",
                userId.get(), stravaActivityId, eventType);
    }
}
