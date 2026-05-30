package com.coachfit.sync.application.service;

import com.coachfit.sync.application.port.in.SyncGarminWebhookUseCase;
import com.coachfit.sync.application.port.out.GarminJobQueuePort;
import com.coachfit.sync.application.port.out.GarminOAuthConnectionPort;
import com.coachfit.sync.application.port.out.SyncLogPersistencePort;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles all Garmin Health API push callbacks.
 *
 * <p><strong>Responsibilities (this layer):</strong>
 * <ol>
 *   <li>Look up CoachFit user by Garmin {@code userAccessToken}</li>
 *   <li>Create a {@code sync_log} entry (status = pending)</li>
 *   <li>Serialize the data element to JSON and enqueue a typed job on the Redis Stream</li>
 *   <li>Return immediately — heavy processing is done by {@link GarminHealthProcessingService}
 *       and {@link GarminActivitySyncService} asynchronously</li>
 * </ol>
 *
 * <p>Per docs/06-sync-engine-spec.md §Push Processing: if the user is not found by
 * {@code userAccessToken}, return 200 + log warning, do not retry.
 *
 * <p>Per docs/06-sync-engine-spec.md §Error Handling: parse errors log but do not
 * block acknowledgment.
 */
@Service
public class GarminWebhookService implements SyncGarminWebhookUseCase {

    private static final Logger log = LoggerFactory.getLogger(GarminWebhookService.class);

    private static final String PROVIDER = "garmin";

    // ── Job type constants ──────────────────────────────────────────────────────
    public static final String JOB_DAILIES          = "garmin_dailies";
    public static final String JOB_ACTIVITY         = "garmin_activity";
    public static final String JOB_ACTIVITY_DETAILS = "garmin_activity_details";
    public static final String JOB_SLEEP            = "garmin_sleep";
    public static final String JOB_BODY             = "garmin_body";
    public static final String JOB_STRESS           = "garmin_stress";
    public static final String JOB_HRV              = "garmin_hrv";
    public static final String JOB_PULSEOX          = "garmin_pulseox";
    public static final String JOB_RESPIRATION      = "garmin_respiration";
    public static final String JOB_USER_METRICS     = "garmin_user_metrics";
    public static final String JOB_EPOCHS           = "garmin_epochs";
    public static final String JOB_BLOOD_PRESSURE   = "garmin_blood_pressure";
    public static final String JOB_MENSTRUAL_CYCLE  = "garmin_menstrual_cycle";
    public static final String JOB_PREGNANCY        = "garmin_pregnancy";

    private final GarminOAuthConnectionPort garminOAuthPort;
    private final GarminJobQueuePort        jobQueuePort;
    private final SyncLogPersistencePort    syncLogPort;
    private final ObjectMapper              objectMapper;

    public GarminWebhookService(GarminOAuthConnectionPort garminOAuthPort,
                                GarminJobQueuePort jobQueuePort,
                                SyncLogPersistencePort syncLogPort,
                                ObjectMapper objectMapper) {
        this.garminOAuthPort = garminOAuthPort;
        this.jobQueuePort    = jobQueuePort;
        this.syncLogPort     = syncLogPort;
        this.objectMapper    = objectMapper;
    }

    // ── SyncGarminWebhookUseCase ──────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_dailies} job. Worker will upsert
     * {@code health_daily_summaries (source='garmin')} and auto-update
     * {@code wellness_logs}: resting_hr, stress_level.
     */
    @Override
    public void handleDailies(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_DAILIES, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_activity} job. Worker will normalize → dedup →
     * calculate metrics → store in {@code activities}.
     */
    @Override
    public void handleActivities(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_ACTIVITY, "activity_created");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_activity_details} job. Worker will match the
     * parent activity by {@code summaryId} and store {@code activity_streams}.
     */
    @Override
    public void handleActivityDetails(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_ACTIVITY_DETAILS, "activity_created");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_sleep} job. Worker will upsert
     * {@code health_sleep_data} and auto-update {@code wellness_logs}:
     * sleep_hours, sleep_quality, hrv.
     */
    @Override
    public void handleSleep(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_SLEEP, "health_sleep_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_body} job. Worker will upsert body composition
     * fields into {@code health_daily_summaries} and wellness weight.
     */
    @Override
    public void handleBodyComposition(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_BODY, "health_body_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_stress} job. Worker will aggregate stress samples
     * and upsert {@code health_daily_summaries.avg_stress}.
     */
    @Override
    public void handleStress(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_STRESS, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_hrv} job. Worker will upsert nightly HRV into
     * {@code health_sleep_data.avg_hrv} and auto-update {@code wellness_logs.hrv}.
     */
    @Override
    public void handleHrv(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_HRV, "health_hrv_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_pulseox} job. Worker will upsert average SpO2
     * into {@code health_daily_summaries.avg_spo2}.
     */
    @Override
    public void handlePulseOx(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_PULSEOX, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_respiration} job. Worker will upsert average
     * breathing rate into {@code health_daily_summaries.avg_respiration}.
     */
    @Override
    public void handleRespiration(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_RESPIRATION, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_user_metrics} job. Worker will upsert VO2max
     * into {@code health_daily_summaries.vo2max} for the most recent date.
     */
    @Override
    public void handleUserMetrics(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_USER_METRICS, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_epochs} job. Worker will upsert intraday
     * epoch rows into {@code health_epoch_summaries}.
     */
    @Override
    public void handleEpochs(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_EPOCHS, "health_epoch_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_blood_pressure} job. Worker will store
     * systolic/diastolic/pulse in {@code health_daily_summaries.extra}.
     */
    @Override
    public void handleBloodPressure(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_BLOOD_PRESSURE, "health_daily_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_menstrual_cycle} job. Worker will store cycle
     * phase and day in {@code health_daily_summaries.extra}.
     */
    @Override
    public void handleMenstrualCycle(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_MENSTRUAL_CYCLE, "health_womens_health_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Enqueues {@code garmin_pregnancy} job. Worker will store pregnancy
     * data in {@code health_daily_summaries.extra}.
     */
    @Override
    public void handlePregnancy(GarminPushPayload<List<Map<String, Object>>> payload) {
        enqueueEach(payload, JOB_PREGNANCY, "health_womens_health_push");
    }

    /**
     * {@inheritDoc}
     *
     * <p>Marks each token's connection as {@code 'disconnected'} in
     * {@code oauth_connections}. Data already synced is preserved per
     * docs/11-privacy-compliance.md §Data Retention.
     */
    @Override
    public void handleDeregistration(GarminDeregistrationPayload payload) {
        if (payload.userAccessTokens() == null || payload.userAccessTokens().isEmpty()) {
            log.warn("Garmin deregistration: empty token list");
            return;
        }

        int count = 0;
        for (String token : payload.userAccessTokens()) {
            if (token == null || token.isBlank()) continue;
            Optional<UUID> userId = garminOAuthPort.findUserIdByAccessToken(token);
            garminOAuthPort.markDeregistered(token);

            if (userId.isPresent()) {
                syncLogPort.create(userId.get(), PROVIDER, "provider_deregistration", null, null);
                log.info("Garmin deregistration: userId={} token={}***", userId.get(), maskToken(token));
                count++;
            } else {
                log.warn("Garmin deregistration: no user found for token={}***", maskToken(token));
            }
        }
        log.info("Garmin deregistration processed: {} user(s)", count);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Iterates over items in a push payload, looks up the user for each, and
     * enqueues a typed job if the user is found.
     *
     * <p>Items with an unknown {@code userAccessToken} are silently dropped per
     * docs/06-sync-engine-spec.md §Garmin push validation.
     */
    private void enqueueEach(GarminPushPayload<List<Map<String, Object>>> payload,
                              String jobType, String eventType) {
        if (payload.data() == null || payload.data().isEmpty()) {
            log.debug("Garmin push: empty payload for jobType={}", jobType);
            return;
        }

        for (Map<String, Object> item : payload.data()) {
            String token = extractToken(item);
            if (token == null) {
                log.warn("Garmin push: missing userAccessToken in item, jobType={}, skipping", jobType);
                continue;
            }

            Optional<UUID> userId = garminOAuthPort.findUserIdByAccessToken(token);
            if (userId.isEmpty()) {
                log.warn("Garmin push: no user for token={}***, jobType={}, dropping", maskToken(token), jobType);
                continue;
            }

            String payloadJson = toJson(item);
            UUID logId = syncLogPort.create(userId.get(), PROVIDER, eventType,
                    extractSourceId(item), payloadJson);
            jobQueuePort.enqueue(userId.get(), jobType, payloadJson);
            log.info("Garmin job enqueued: type={} userId={} logId={}", jobType, userId.get(), logId);
        }
    }

    /** Extracts {@code userAccessToken} from a Garmin data element. */
    private static String extractToken(Map<String, Object> item) {
        if (item == null) return null;
        Object t = item.get("userAccessToken");
        return t instanceof String s ? s : null;
    }

    /**
     * Extracts a best-effort source identifier for the sync log.
     * Falls back to null if none of the known ID fields are present.
     */
    private static String extractSourceId(Map<String, Object> item) {
        for (String key : new String[]{"summaryId", "activityId", "calendarDate",
                "startTimeInSeconds", "measurementTimeInSeconds"}) {
            Object v = item.get(key);
            if (v != null) return String.valueOf(v);
        }
        return null;
    }

    /** Serialises a map to JSON; returns "{}" on error. */
    private String toJson(Map<String, Object> item) {
        try {
            return objectMapper.writeValueAsString(item);
        } catch (JsonProcessingException e) {
            log.warn("Garmin push: failed to serialise payload element: {}", e.getMessage());
            return "{}";
        }
    }

    /** Masks a user access token for safe logging. */
    private static String maskToken(String token) {
        if (token == null || token.length() <= 8) return "***";
        return token.substring(0, 8) + "***";
    }
}
