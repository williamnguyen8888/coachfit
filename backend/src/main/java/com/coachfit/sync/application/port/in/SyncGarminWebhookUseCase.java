package com.coachfit.sync.application.port.in;

import java.util.List;
import java.util.Map;

/**
 * Use case port for handling all Garmin Health API push callbacks.
 *
 * <p>Garmin uses a push-based architecture — Garmin cloud POSTs data to our endpoints
 * as soon as it becomes available on the device sync. No polling required.
 *
 * <p>Each method maps to one of the registered push callback URLs
 * (docs/05-api-design.md §Webhooks (Incoming), docs/06-sync-engine-spec.md §Push Callback URLs).
 *
 * <h3>Common contract for all handlers</h3>
 * <ul>
 *   <li>Must return 200 within 5 seconds (Garmin requirement)</li>
 *   <li>All heavy processing is done asynchronously via Redis Stream</li>
 *   <li>If user not found by userAccessToken → acknowledge 200, log warning, drop</li>
 *   <li>Raw payload logged for debugging; parse errors do not block acknowledgment</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Health API Integration §Push Processing.
 */
public interface SyncGarminWebhookUseCase {

    /**
     * Handles Garmin daily summary push (steps, calories, resting HR, avg stress, body battery, SpO2).
     *
     * <p>Payload key: {@code dailies} — array of daily summary objects.
     * Each element contains {@code userAccessToken} to identify the CoachFit user.
     *
     * <p>Processing (docs/06-sync-engine-spec.md §Health Data Processing §Dailies push):
     * <ol>
     *   <li>Find user by userAccessToken</li>
     *   <li>Enqueue Redis job → worker upserts {@code health_daily_summaries (source='garmin')}</li>
     *   <li>Auto-update {@code wellness_logs}: resting_hr, stress_level</li>
     * </ol>
     */
    void handleDailies(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin activity summary push (activity metadata without time-series).
     *
     * <p>Payload key: {@code activities} — array of activity summary objects.
     * Processing: normalize → dedup → calculate metrics → enqueue for storage.
     * Cross-source dedup with Strava if user has both connected.
     */
    void handleActivities(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin activity detail push (time-series streams: HR, power, cadence, GPS, altitude).
     *
     * <p>Payload key: {@code activityDetails} — array, each with {@code summaryId} linking
     * to the parent activity and {@code samples} array containing per-second data.
     * Processing: match to existing activity → store {@code activity_streams} + {@code activity_laps}.
     */
    void handleActivityDetails(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin sleep data push (stages, score, duration, nightly HRV).
     *
     * <p>Payload key: {@code sleeps} — array of sleep session objects.
     * Processing (docs/06-sync-engine-spec.md §Sleep push):
     * Upsert {@code health_sleep_data}; auto-update {@code wellness_logs}: sleep_hours, sleep_quality, hrv.
     */
    void handleSleep(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin body composition push (weight, BMI, body fat %).
     *
     * <p>Payload key: {@code bodyComps} — array of body composition readings.
     * Processing: upsert into {@code health_daily_summaries} body composition fields.
     */
    void handleBodyComposition(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin stress data push (stress level readings throughout the day).
     *
     * <p>Payload key: {@code stressDetails} — array of stress detail objects with
     * per-sample stress readings. Processing: aggregate and upsert into
     * {@code health_daily_summaries.avg_stress}.
     */
    void handleStress(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin HRV (Heart Rate Variability) push (nightly HRV summary).
     *
     * <p>Payload key: {@code hrv} — array of HRV summary objects.
     * Processing: upsert into {@code health_sleep_data.hrv_nightly_avg},
     * auto-update {@code wellness_logs.hrv}.
     */
    void handleHrv(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin Pulse Ox (SpO2) data push.
     *
     * <p>Payload key: {@code pulseOx} — array of SpO2 reading objects.
     * Processing: upsert into {@code health_daily_summaries.avg_spo2}.
     */
    void handlePulseOx(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin respiration (breathing rate) push.
     *
     * <p>Payload key: {@code respirationEpochSummaries} — breathing rate samples.
     * Processing: store in {@code health_daily_summaries} respiration field (future column).
     */
    void handleRespiration(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin user metrics push (VO2max, training status, fitness age).
     *
     * <p>Payload key: {@code userMetrics} — array of user metrics objects.
     * Processing: upsert into {@code athlete_profiles} VO2max / training_status fields.
     */
    void handleUserMetrics(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin epoch (intraday 15-minute) summaries push.
     *
     * <p>Payload key: {@code epochs} — array of 15-minute summary objects.
     * Processing: upsert into {@code health_epoch_summaries}. Useful for intraday
     * activity timeline visualization and pattern analysis.
     */
    void handleEpochs(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin blood pressure push.
     *
     * <p>Payload key: {@code bloodPressures} — array of blood pressure readings.
     * Processing: store systolic, diastolic, pulse into {@code health_daily_summaries.extra}.
     * Only available on Garmin devices with blood pressure sensors.
     */
    void handleBloodPressure(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin menstrual cycle data push.
     *
     * <p>Payload key: {@code menstrualCycle} — menstrual cycle tracking data.
     * Processing: store cycle phase, day, predictions in {@code health_daily_summaries.extra}.
     */
    void handleMenstrualCycle(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin pregnancy tracking data push.
     *
     * <p>Payload key: {@code pregnancy} — pregnancy tracking data.
     * Processing: store weeks pregnant, due date in {@code health_daily_summaries.extra}.
     */
    void handlePregnancy(GarminPushPayload<List<Map<String, Object>>> payload);

    /**
     * Handles Garmin deregistration callback — user unlinked CoachFit from Garmin Connect.
     *
     * <p>Processing: set {@code oauth_connections.sync_status = 'revoked'} for the user,
     * log the event. Data already synced is preserved.
     *
     * @param payload contains {@code userAccessTokens} array of revoked tokens
     */
    void handleDeregistration(GarminDeregistrationPayload payload);

    // ── Payload carriers ──────────────────────────────────────────────────────

    /**
     * Generic wrapper around a Garmin push payload.
     *
     * <p>Each Garmin push body follows a pattern:
     * {@code { "userId": "...", "userAccessToken": "...", "data": [...] }}
     * where the top-level key name varies by push type.
     *
     * @param <T> the type of the data array (usually {@code List<Map<String, Object>>})
     */
    record GarminPushPayload<T>(
            String userId,           // Garmin internal user ID (not CoachFit)
            String userAccessToken,  // identifies the CoachFit user (stored as provider_user_id)
            T      data              // type-specific payload array
    ) {}

    /**
     * Payload for the deregistration callback.
     *
     * <p>Garmin sends {@code { "userAccessTokens": ["token1", "token2"] }}
     * (batch deregistration possible if multiple users revoke simultaneously).
     */
    record GarminDeregistrationPayload(
            List<String> userAccessTokens
    ) {}
}
