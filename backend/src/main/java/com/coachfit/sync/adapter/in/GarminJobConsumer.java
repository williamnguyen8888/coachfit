package com.coachfit.sync.adapter.in;

import com.coachfit.sync.application.service.GarminActivitySyncService;
import com.coachfit.sync.application.service.GarminHealthProcessingService;
import com.coachfit.sync.application.service.GarminWebhookService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Redis Stream consumer for Garmin push processing jobs.
 *
 * <p>Reads from the shared {@code sync:jobs} stream, consumer group
 * {@code sync-workers}, under consumer name {@code garmin-worker-1}.
 * Strava jobs (handled by {@link StravaJobConsumer} as {@code worker-1}) use a
 * different consumer name so both consumers compete for undelivered messages
 * without stepping on each other.
 *
 * <p>Dispatch table:
 * <ul>
 *   <li>Health types → {@link GarminHealthProcessingService}</li>
 *   <li>Activity types → {@link GarminActivitySyncService}</li>
 *   <li>Non-garmin provider → skip (leave for Strava consumer)</li>
 * </ul>
 *
 * <p>Error handling:
 * <ul>
 *   <li>Transient failures: ack + re-enqueue with incremented attempt</li>
 *   <li>After {@value MAX_ATTEMPTS}: move to {@code sync:dead_letter}</li>
 *   <li>Pending recovery: every 5 minutes via {@link #recoverPendingMessages()}</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Redis Stream Design.
 */
@Component
@EnableScheduling
public class GarminJobConsumer {

    private static final Logger log = LoggerFactory.getLogger(GarminJobConsumer.class);

    static final String STREAM_KEY      = "sync:jobs";
    static final String DEAD_LETTER_KEY = "sync:dead_letter";
    static final String CONSUMER_GROUP  = "sync-workers";
    static final String CONSUMER_NAME   = "garmin-worker-1";
    static final int    MAX_ATTEMPTS    = 3;

    private static final Duration PENDING_MIN_IDLE = Duration.ofSeconds(60);

    private final StringRedisTemplate           redisTemplate;
    private final GarminHealthProcessingService healthService;
    private final GarminActivitySyncService     activityService;

    public GarminJobConsumer(StringRedisTemplate redisTemplate,
                             GarminHealthProcessingService healthService,
                             GarminActivitySyncService activityService) {
        this.redisTemplate   = redisTemplate;
        this.healthService   = healthService;
        this.activityService = activityService;
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    /**
     * Ensures the consumer group exists. The group is also created by
     * {@link StravaJobConsumer}; this is idempotent — duplicate BUSYGROUP errors
     * are silently swallowed.
     */
    @PostConstruct
    public void initConsumerGroup() {
        try {
            redisTemplate.opsForStream()
                    .createGroup(STREAM_KEY, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("Garmin consumer group '{}' created on stream '{}'", CONSUMER_GROUP, STREAM_KEY);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.debug("Garmin consumer group already exists: {}", CONSUMER_GROUP);
            } else {
                log.warn("Could not create consumer group (will retry on next poll): {}", e.getMessage());
            }
        }
    }

    // ── Main poll loop ────────────────────────────────────────────────────────

    /**
     * Polls the {@code sync:jobs} stream every second for new Garmin messages.
     *
     * <p>Only processes messages where {@code provider = 'garmin'}. Others are
     * left unacked for the Strava consumer. Note: because Strava consumer acks
     * non-strava and Garmin consumer acks non-garmin, both independently skip
     * messages for the other provider.
     */
    @Scheduled(fixedDelay = 1000)
    public void pollJobs() {
        try {
            List<MapRecord<String, Object, Object>> messages = redisTemplate.opsForStream()
                    .read(Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                            StreamReadOptions.empty().count(10),
                            StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()));

            if (messages == null || messages.isEmpty()) return;

            for (MapRecord<String, Object, Object> record : messages) {
                processRecord(record);
            }
        } catch (Exception e) {
            log.error("Garmin consumer poll error: {}", e.getMessage(), e);
        }
    }

    // ── Pending recovery ──────────────────────────────────────────────────────

    /**
     * Every 5 minutes: reclaims messages pending in the Garmin consumer's backlog
     * for more than 60 seconds (crash-recovery).
     */
    @Scheduled(fixedDelay = 300_000)
    public void recoverPendingMessages() {
        try {
            PendingMessagesSummary summary = redisTemplate.opsForStream()
                    .pending(STREAM_KEY, CONSUMER_GROUP);
            if (summary == null || summary.getTotalPendingMessages() == 0) return;

            PendingMessages pending = redisTemplate.opsForStream()
                    .pending(STREAM_KEY, Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                            Range.unbounded(), 10L);
            if (pending == null || pending.isEmpty()) return;

            for (PendingMessage pm : pending) {
                if (pm.getElapsedTimeSinceLastDelivery().compareTo(PENDING_MIN_IDLE) < 0) continue;
                RecordId recordId = pm.getId();
                List<MapRecord<String, Object, Object>> msgs = redisTemplate.opsForStream()
                        .range(STREAM_KEY, Range.closed(recordId.getValue(), recordId.getValue()));
                if (msgs != null && !msgs.isEmpty()) {
                    log.info("Garmin: reclaiming idle pending message id={}", recordId);
                    processRecord(msgs.get(0));
                }
            }
        } catch (Exception e) {
            log.error("Garmin pending recovery error: {}", e.getMessage(), e);
        }
    }

    // ── Record processing ─────────────────────────────────────────────────────

    private void processRecord(MapRecord<String, Object, Object> record) {
        Map<Object, Object> body   = record.getValue();
        String              msgId  = record.getId().getValue();

        String provider = str(body, "provider");
        if (!"garmin".equals(provider)) {
            // Not a Garmin job — ack to remove from this consumer's pending list
            // (Strava consumer will pick it up under its consumer name)
            ack(msgId);
            return;
        }

        String type    = str(body, "type");
        String userId  = str(body, "userId");
        String payload = str(body, "payload");
        int    attempt = parseIntSafe(str(body, "attempt"));

        if (userId == null || userId.isBlank() || type == null || type.isBlank()) {
            log.warn("Garmin job missing required fields, acking+skipping: body={}", body);
            ack(msgId);
            return;
        }

        UUID uid   = UUID.fromString(userId);
        UUID logId = new UUID(0, 0); // sentinel; services manage their own log rows

        log.debug("Garmin job dispatching: type={} userId={} attempt={}", type, userId, attempt);

        try {
            dispatch(uid, logId, type, payload);
            ack(msgId);
        } catch (Exception e) {
            log.error("Garmin job failed (attempt {}): type={} userId={} error={}",
                    attempt + 1, type, userId, e.getMessage());
            ack(msgId); // Remove from pending regardless

            if (attempt + 1 < MAX_ATTEMPTS) {
                // Re-enqueue with incremented attempt counter
                requeueWithAttempt(uid, type, payload, attempt + 1);
                log.info("Garmin job re-queued: type={} userId={} nextAttempt={}", type, userId, attempt + 1);
            } else {
                sendToDeadLetter(uid, type, payload, e.getMessage());
                log.error("Garmin job dead-lettered after {} attempts: type={} userId={}", MAX_ATTEMPTS, type, userId);
            }
        }
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    private void dispatch(UUID userId, UUID logId, String type, String payload) {
        switch (type) {
            case GarminWebhookService.JOB_DAILIES          -> healthService.processDailies(userId, logId, payload);
            case GarminWebhookService.JOB_SLEEP            -> healthService.processSleep(userId, logId, payload);
            case GarminWebhookService.JOB_BODY             -> healthService.processBodyComposition(userId, logId, payload);
            case GarminWebhookService.JOB_STRESS           -> healthService.processStress(userId, logId, payload);
            case GarminWebhookService.JOB_HRV              -> healthService.processHrv(userId, logId, payload);
            case GarminWebhookService.JOB_PULSEOX          -> healthService.processPulseOx(userId, logId, payload);
            case GarminWebhookService.JOB_RESPIRATION      -> healthService.processRespiration(userId, logId, payload);
            case GarminWebhookService.JOB_USER_METRICS     -> healthService.processUserMetrics(userId, logId, payload);
            case GarminWebhookService.JOB_EPOCHS           -> healthService.processEpochs(userId, logId, payload);
            case GarminWebhookService.JOB_BLOOD_PRESSURE   -> healthService.processBloodPressure(userId, logId, payload);
            case GarminWebhookService.JOB_MENSTRUAL_CYCLE  -> healthService.processMenstrualCycle(userId, logId, payload);
            case GarminWebhookService.JOB_PREGNANCY        -> healthService.processPregnancy(userId, logId, payload);
            case GarminWebhookService.JOB_ACTIVITY         -> activityService.processActivity(userId, logId, payload);
            case GarminWebhookService.JOB_ACTIVITY_DETAILS -> activityService.processActivityDetails(userId, logId, payload);
            default -> {
                log.warn("Unknown Garmin job type '{}', skipping userId={}", type, userId);
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void ack(String messageId) {
        try {
            redisTemplate.opsForStream().acknowledge(STREAM_KEY, CONSUMER_GROUP, messageId);
        } catch (Exception e) {
            log.warn("Failed to acknowledge Garmin message {}: {}", messageId, e.getMessage());
        }
    }

    private void requeueWithAttempt(UUID userId, String type, String payload, int attempt) {
        Map<String, String> body = Map.of(
                "type",      type,
                "userId",    userId.toString(),
                "provider",  "garmin",
                "payload",   payload != null ? payload : "{}",
                "attempt",   String.valueOf(attempt),
                "createdAt", Instant.now().toString()
        );
        var record = StreamRecords.mapBacked(body).withStreamKey(STREAM_KEY);
        redisTemplate.opsForStream().add(record);
    }

    private void sendToDeadLetter(UUID userId, String type, String payload, String error) {
        Map<String, String> body = Map.of(
                "type",         type,
                "userId",       userId.toString(),
                "provider",     "garmin",
                "payload",      payload != null ? payload : "{}",
                "errorMessage", error != null ? error : "",
                "failedAt",     Instant.now().toString()
        );
        var record = StreamRecords.mapBacked(body).withStreamKey(DEAD_LETTER_KEY);
        redisTemplate.opsForStream().add(record);
    }

    private static String str(Map<Object, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString() : null;
    }

    private static int parseIntSafe(String s) {
        if (s == null) return 0;
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return 0; }
    }
}
