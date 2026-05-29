package com.coachfit.sync.adapter.in;

import com.coachfit.sync.application.port.in.SyncGarminWebhookUseCase;
import com.coachfit.sync.application.port.in.SyncGarminWebhookUseCase.GarminDeregistrationPayload;
import com.coachfit.sync.application.port.in.SyncGarminWebhookUseCase.GarminPushPayload;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HTTP adapter for all Garmin Health API push callback endpoints.
 *
 * <pre>
 * POST /api/v1/webhooks/garmin/dailies           — daily summaries (steps, HR, stress, body battery)
 * POST /api/v1/webhooks/garmin/activities        — activity summaries
 * POST /api/v1/webhooks/garmin/activity-details  — activity time-series streams
 * POST /api/v1/webhooks/garmin/sleep             — sleep stages, score, HRV
 * POST /api/v1/webhooks/garmin/body              — body composition
 * POST /api/v1/webhooks/garmin/stress            — stress data
 * POST /api/v1/webhooks/garmin/hrv               — nightly HRV summary
 * POST /api/v1/webhooks/garmin/pulseox           — Pulse Ox / SpO2
 * POST /api/v1/webhooks/garmin/respiration       — breathing rate
 * POST /api/v1/webhooks/garmin/user-metrics      — VO2max, training status
 * POST /api/v1/webhooks/garmin/deregistration    — user unlinked Garmin
 * </pre>
 *
 * <p>All endpoints are public (no auth required) — whitelisted in {@code SecurityConfig}
 * under {@code /api/v1/webhooks/**}. Authorization is performed by the service layer via
 * payload-embedded {@code userAccessToken} lookup.
 *
 * <p><strong>Garmin requirement:</strong> respond with 200 within 5 seconds.
 * All processing is delegated to the service layer (async via Redis Stream in future tickets).
 *
 * <p>Push payload validation (docs/06-sync-engine-spec.md §Garmin push validation):
 * <ul>
 *   <li>IP whitelist and signature verification are done by the service layer (future ticket)</li>
 *   <li>If user not found by userAccessToken → service returns 200, logs warning, drops</li>
 * </ul>
 *
 * <p>See docs/05-api-design.md §Webhooks (Incoming).
 * See docs/06-sync-engine-spec.md §Garmin Health API Integration §Push Callback URLs.
 */
@RestController
@RequestMapping("/api/v1/webhooks/garmin")
class GarminWebhookController {

    private static final Logger log = LoggerFactory.getLogger(GarminWebhookController.class);

    private final SyncGarminWebhookUseCase webhookUseCase;

    GarminWebhookController(SyncGarminWebhookUseCase webhookUseCase) {
        this.webhookUseCase = webhookUseCase;
    }

    // ── POST /webhooks/garmin/dailies ─────────────────────────────────────────

    /**
     * Receives Garmin daily summary push: steps, calories, resting HR, avg stress, body battery, SpO2.
     *
     * <p>Garmin payload shape:
     * {@code { "dailies": [{ "userAccessToken": "...", "startTimeInSeconds": ..., "steps": ..., ... }] }}
     */
    @PostMapping("/dailies")
    ResponseEntity<Void> receiveDailies(@RequestBody(required = false) DailiesDto body) {
        if (body == null || body.dailies() == null) {
            log.warn("Garmin /dailies received empty or null payload");
            return ResponseEntity.ok().build();
        }
        // Route each daily entry; Garmin batches multiple users in one push
        for (Map<String, Object> daily : body.dailies()) {
            String userAccessToken = extractUserAccessToken(daily);
            webhookUseCase.handleDailies(new GarminPushPayload<>(
                    null, userAccessToken, List.of(daily)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/activities ──────────────────────────────────────

    /**
     * Receives Garmin activity summary push (without time-series data).
     *
     * <p>Garmin payload shape:
     * {@code { "activities": [{ "userAccessToken": "...", "activityId": ..., "activityType": "...", ... }] }}
     */
    @PostMapping("/activities")
    ResponseEntity<Void> receiveActivities(@RequestBody(required = false) ActivitiesDto body) {
        if (body == null || body.activities() == null) {
            log.warn("Garmin /activities received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> activity : body.activities()) {
            String userAccessToken = extractUserAccessToken(activity);
            webhookUseCase.handleActivities(new GarminPushPayload<>(
                    null, userAccessToken, List.of(activity)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/activity-details ────────────────────────────────

    /**
     * Receives Garmin activity detail push (time-series: HR, power, cadence, GPS, altitude).
     *
     * <p>Garmin payload shape:
     * {@code { "activityDetails": [{ "userAccessToken": "...", "summaryId": "...", "samples": [...] }] }}
     */
    @PostMapping("/activity-details")
    ResponseEntity<Void> receiveActivityDetails(@RequestBody(required = false) ActivityDetailsDto body) {
        if (body == null || body.activityDetails() == null) {
            log.warn("Garmin /activity-details received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> detail : body.activityDetails()) {
            String userAccessToken = extractUserAccessToken(detail);
            webhookUseCase.handleActivityDetails(new GarminPushPayload<>(
                    null, userAccessToken, List.of(detail)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/sleep ───────────────────────────────────────────

    /**
     * Receives Garmin sleep data push (stages, score, duration, nightly HRV).
     *
     * <p>Garmin payload shape:
     * {@code { "sleeps": [{ "userAccessToken": "...", "calendarDate": "...", "sleepTimeSeconds": ..., ... }] }}
     */
    @PostMapping("/sleep")
    ResponseEntity<Void> receiveSleep(@RequestBody(required = false) SleepDto body) {
        if (body == null || body.sleeps() == null) {
            log.warn("Garmin /sleep received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> sleep : body.sleeps()) {
            String userAccessToken = extractUserAccessToken(sleep);
            webhookUseCase.handleSleep(new GarminPushPayload<>(
                    null, userAccessToken, List.of(sleep)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/body ────────────────────────────────────────────

    /**
     * Receives Garmin body composition push (weight, BMI, body fat %).
     *
     * <p>Garmin payload shape:
     * {@code { "bodyComps": [{ "userAccessToken": "...", "measurementTimeInSeconds": ..., "weightInGrams": ..., ... }] }}
     */
    @PostMapping("/body")
    ResponseEntity<Void> receiveBodyComposition(@RequestBody(required = false) BodyDto body) {
        if (body == null || body.bodyComps() == null) {
            log.warn("Garmin /body received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> comp : body.bodyComps()) {
            String userAccessToken = extractUserAccessToken(comp);
            webhookUseCase.handleBodyComposition(new GarminPushPayload<>(
                    null, userAccessToken, List.of(comp)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/stress ──────────────────────────────────────────

    /**
     * Receives Garmin stress data push (stress level readings throughout the day).
     *
     * <p>Garmin payload shape:
     * {@code { "stressDetails": [{ "userAccessToken": "...", "startTimeInSeconds": ..., "stressLevel": ..., ... }] }}
     */
    @PostMapping("/stress")
    ResponseEntity<Void> receiveStress(@RequestBody(required = false) StressDto body) {
        if (body == null || body.stressDetails() == null) {
            log.warn("Garmin /stress received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> stress : body.stressDetails()) {
            String userAccessToken = extractUserAccessToken(stress);
            webhookUseCase.handleStress(new GarminPushPayload<>(
                    null, userAccessToken, List.of(stress)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/hrv ─────────────────────────────────────────────

    /**
     * Receives Garmin HRV (Heart Rate Variability) push (nightly HRV summary).
     *
     * <p>Garmin payload shape:
     * {@code { "hrv": [{ "userAccessToken": "...", "startTimeInSeconds": ..., "hrvSummary": {...} }] }}
     */
    @PostMapping("/hrv")
    ResponseEntity<Void> receiveHrv(@RequestBody(required = false) HrvDto body) {
        if (body == null || body.hrv() == null) {
            log.warn("Garmin /hrv received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> hrv : body.hrv()) {
            String userAccessToken = extractUserAccessToken(hrv);
            webhookUseCase.handleHrv(new GarminPushPayload<>(
                    null, userAccessToken, List.of(hrv)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/pulseox ─────────────────────────────────────────

    /**
     * Receives Garmin Pulse Ox (SpO2) data push.
     *
     * <p>Garmin payload shape:
     * {@code { "pulseOx": [{ "userAccessToken": "...", "startTimeInSeconds": ..., "spo2Value": ..., ... }] }}
     */
    @PostMapping("/pulseox")
    ResponseEntity<Void> receivePulseOx(@RequestBody(required = false) PulseOxDto body) {
        if (body == null || body.pulseOx() == null) {
            log.warn("Garmin /pulseox received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> reading : body.pulseOx()) {
            String userAccessToken = extractUserAccessToken(reading);
            webhookUseCase.handlePulseOx(new GarminPushPayload<>(
                    null, userAccessToken, List.of(reading)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/respiration ─────────────────────────────────────

    /**
     * Receives Garmin respiration (breathing rate) data push.
     *
     * <p>Garmin payload shape:
     * {@code { "respirationEpochSummaries": [{ "userAccessToken": "...", "startTimeInSeconds": ..., ... }] }}
     */
    @PostMapping("/respiration")
    ResponseEntity<Void> receiveRespiration(@RequestBody(required = false) RespirationDto body) {
        if (body == null || body.respirationEpochSummaries() == null) {
            log.warn("Garmin /respiration received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> epoch : body.respirationEpochSummaries()) {
            String userAccessToken = extractUserAccessToken(epoch);
            webhookUseCase.handleRespiration(new GarminPushPayload<>(
                    null, userAccessToken, List.of(epoch)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/user-metrics ────────────────────────────────────

    /**
     * Receives Garmin user metrics push (VO2max, training status, fitness age).
     *
     * <p>Garmin payload shape:
     * {@code { "userMetrics": [{ "userAccessToken": "...", "vo2Max": ..., "fitnessAge": ..., ... }] }}
     */
    @PostMapping("/user-metrics")
    ResponseEntity<Void> receiveUserMetrics(@RequestBody(required = false) UserMetricsDto body) {
        if (body == null || body.userMetrics() == null) {
            log.warn("Garmin /user-metrics received empty or null payload");
            return ResponseEntity.ok().build();
        }
        for (Map<String, Object> metric : body.userMetrics()) {
            String userAccessToken = extractUserAccessToken(metric);
            webhookUseCase.handleUserMetrics(new GarminPushPayload<>(
                    null, userAccessToken, List.of(metric)));
        }
        return ResponseEntity.ok().build();
    }

    // ── POST /webhooks/garmin/deregistration ──────────────────────────────────

    /**
     * Receives Garmin deregistration notification — user unlinked CoachFit from Garmin Connect.
     *
     * <p>Garmin payload shape:
     * {@code { "userAccessTokens": ["token1", "token2"] }}
     *
     * <p>Note: Garmin may batch multiple deregistrations in a single push.
     * Must return 200; the service marks those connections as revoked.
     */
    @PostMapping("/deregistration")
    ResponseEntity<Void> receiveDeregistration(@RequestBody(required = false) DeregistrationDto body) {
        if (body == null || body.userAccessTokens() == null) {
            log.warn("Garmin /deregistration received empty or null payload");
            return ResponseEntity.ok().build();
        }
        webhookUseCase.handleDeregistration(new GarminDeregistrationPayload(body.userAccessTokens()));
        return ResponseEntity.ok().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Extracts {@code userAccessToken} from a Garmin data element map.
     *
     * <p>Garmin embeds the user access token directly in each data element
     * (not at the top level) so we can identify the CoachFit user per item.
     * Returns {@code null} if absent — the service layer handles the missing-user case.
     */
    private static String extractUserAccessToken(Map<String, Object> element) {
        if (element == null) return null;
        Object token = element.get("userAccessToken");
        return token instanceof String s ? s : null;
    }

    // ── Request DTOs (Garmin push bodies) ─────────────────────────────────────

    record DailiesDto(
            List<Map<String, Object>> dailies
    ) {}

    record ActivitiesDto(
            List<Map<String, Object>> activities
    ) {}

    record ActivityDetailsDto(
            @JsonProperty("activityDetails") List<Map<String, Object>> activityDetails
    ) {}

    record SleepDto(
            List<Map<String, Object>> sleeps
    ) {}

    record BodyDto(
            List<Map<String, Object>> bodyComps
    ) {}

    record StressDto(
            List<Map<String, Object>> stressDetails
    ) {}

    record HrvDto(
            List<Map<String, Object>> hrv
    ) {}

    record PulseOxDto(
            List<Map<String, Object>> pulseOx
    ) {}

    record RespirationDto(
            @JsonProperty("respirationEpochSummaries") List<Map<String, Object>> respirationEpochSummaries
    ) {}

    record UserMetricsDto(
            List<Map<String, Object>> userMetrics
    ) {}

    record DeregistrationDto(
            List<String> userAccessTokens
    ) {}
}
