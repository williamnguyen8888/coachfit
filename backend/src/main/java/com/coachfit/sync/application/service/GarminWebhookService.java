package com.coachfit.sync.application.service;

import com.coachfit.sync.application.port.in.SyncGarminWebhookUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Service stub for handling all Garmin Health API push callbacks.
 *
 * <p><strong>This ticket scope:</strong> ingress skeleton only.
 * Each handler logs receipt and acknowledges. Health data persistence
 * (writing to {@code health_daily_summaries}, {@code health_sleep_data}, etc.)
 * is implemented in a subsequent ticket per docs/06-sync-engine-spec.md §Health Data Processing.
 *
 * <p>When health persistence is implemented, each method will:
 * <ol>
 *   <li>Validate the payload (look up user by {@code userAccessToken})</li>
 *   <li>Push a typed job to Redis Stream {@code sync:jobs}</li>
 *   <li>Return immediately — heavy processing is async</li>
 * </ol>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Health API Integration.
 */
@Service
public class GarminWebhookService implements SyncGarminWebhookUseCase {

    private static final Logger log = LoggerFactory.getLogger(GarminWebhookService.class);

    // ── SyncGarminWebhookUseCase ──────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): look up user by userAccessToken,
     * push {@code garmin_dailies} job to Redis Stream, return immediately.
     * Worker to upsert {@code health_daily_summaries} (source='garmin')
     * and auto-update {@code wellness_logs}.
     */
    @Override
    public void handleDailies(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: dailies user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_dailies job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): normalize Garmin activity → internal model,
     * run cross-source dedup with Strava, push {@code garmin_activity} job to Redis Stream.
     */
    @Override
    public void handleActivities(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: activities user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_activity jobs
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): match to parent activity by summaryId,
     * store {@code activity_streams} + {@code activity_laps}.
     */
    @Override
    public void handleActivityDetails(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: activity-details user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_activity_details jobs
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): upsert {@code health_sleep_data},
     * auto-update {@code wellness_logs}: sleep_hours, sleep_quality, hrv.
     */
    @Override
    public void handleSleep(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: sleep user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_sleep job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): upsert body composition fields
     * into {@code health_daily_summaries}.
     */
    @Override
    public void handleBodyComposition(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: body-composition user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_body_composition job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): aggregate stress samples → avg,
     * upsert {@code health_daily_summaries.avg_stress}.
     */
    @Override
    public void handleStress(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: stress user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_stress job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): upsert {@code health_sleep_data.hrv_nightly_avg},
     * auto-update {@code wellness_logs.hrv}.
     */
    @Override
    public void handleHrv(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: hrv user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_hrv job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): upsert {@code health_daily_summaries.avg_spo2}.
     */
    @Override
    public void handlePulseOx(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: pulse-ox user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_pulse_ox job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): store breathing rate data.
     */
    @Override
    public void handleRespiration(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: respiration user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_respiration job
    }

    /**
     * {@inheritDoc}
     *
     * <p>TODO (health-persistence ticket): upsert VO2max / training_status
     * into {@code athlete_profiles}.
     */
    @Override
    public void handleUserMetrics(GarminPushPayload<List<Map<String, Object>>> payload) {
        log.info("Garmin push received: user-metrics user={} items={}",
                maskToken(payload.userAccessToken()),
                payload.data() != null ? payload.data().size() : 0);
        // TODO: enqueue garmin_user_metrics job
    }

    /**
     * {@inheritDoc}
     *
     * <p>When health persistence is implemented: set
     * {@code oauth_connections.sync_status = 'revoked'} for each token in the list.
     * Data already synced is preserved per data-retention policy.
     */
    @Override
    public void handleDeregistration(GarminDeregistrationPayload payload) {
        int count = payload.userAccessTokens() != null ? payload.userAccessTokens().size() : 0;
        log.info("Garmin deregistration push received: {} user(s) unlinked", count);
        // TODO: mark oauth_connections.sync_status = 'revoked' for each token
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Masks a user access token for safe logging. */
    private static String maskToken(String token) {
        if (token == null || token.length() <= 8) return "***";
        return token.substring(0, 8) + "***";
    }
}
