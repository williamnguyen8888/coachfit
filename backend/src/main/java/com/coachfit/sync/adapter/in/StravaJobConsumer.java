package com.coachfit.sync.adapter.in;

import com.coachfit.sync.application.port.out.StravaJobQueuePort;
import com.coachfit.sync.application.service.StravaActivitySyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Range;

/**
 * Redis Stream consumer for the {@code sync:jobs} stream.
 *
 * <p>Implements the worker side of docs/06-sync-engine-spec.md §Redis Stream Design:
 * <ul>
 *   <li>Consumer group: {@code sync-workers}</li>
 *   <li>Consumer name: {@code worker-1} (single consumer for MVP)</li>
 *   <li>Batch: up to 10 messages per poll</li>
 *   <li>Retry: up to {@value MAX_ATTEMPTS} times with re-enqueue; then dead-letter</li>
 *   <li>Pending recovery: every 5 minutes, reclaims messages idle &gt;60s</li>
 * </ul>
 *
 * <p>Scheduling is enabled via {@link EnableScheduling} on this component.
 * For MVP, a single consumer is sufficient; additional consumers can be added to
 * the same group for horizontal scaling.
 */
@Component
@EnableScheduling
class StravaJobConsumer {

    private static final Logger log = LoggerFactory.getLogger(StravaJobConsumer.class);

    static final String STREAM_KEY     = "sync:jobs";
    static final String CONSUMER_GROUP = "sync-workers";
    static final String CONSUMER_NAME  = "worker-1";
    static final int    MAX_ATTEMPTS   = 3;

    /** Minimum age of a pending message before it is reclaimed (60 seconds). */
    private static final Duration PENDING_MIN_IDLE = Duration.ofSeconds(60);

    private final StringRedisTemplate       redisTemplate;
    private final StravaActivitySyncService syncService;
    private final StravaJobQueuePort        jobQueuePort;

    StravaJobConsumer(StringRedisTemplate redisTemplate,
                      StravaActivitySyncService syncService,
                      StravaJobQueuePort jobQueuePort) {
        this.redisTemplate = redisTemplate;
        this.syncService   = syncService;
        this.jobQueuePort  = jobQueuePort;
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    /**
     * Creates the consumer group on startup if it doesn't exist.
     * Uses {@code MKSTREAM} to also create the stream key if absent.
     */
    @PostConstruct
    void initConsumerGroup() {
        try {
            redisTemplate.opsForStream()
                    .createGroup(STREAM_KEY, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("Redis Stream consumer group created: stream={} group={}", STREAM_KEY, CONSUMER_GROUP);
        } catch (Exception e) {
            // Group already exists — this is expected on restart
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.debug("Redis Stream consumer group already exists: {}", CONSUMER_GROUP);
            } else {
                log.warn("Could not create consumer group (will retry on next poll): {}", e.getMessage());
            }
        }
    }

    // ── Main poll loop ────────────────────────────────────────────────────────

    /**
     * Polls the {@code sync:jobs} stream every second for new messages.
     *
     * <p>Uses {@code XREADGROUP} with {@code >} (new messages not yet delivered).
     * Acknowledgement ({@code XACK}) only happens after successful processing.
     */
    @Scheduled(fixedDelay = 1000)
    void pollJobs() {
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
            log.error("Error polling sync:jobs stream: {}", e.getMessage(), e);
        }
    }

    // ── Pending recovery ──────────────────────────────────────────────────────

    /**
     * Every 5 minutes: reclaims messages that have been pending for more than 60 seconds.
     * This handles the case where the worker crashed mid-processing.
     *
     * <p>Per spec: "Scheduled job check XPENDING every 5 minutes, reclaim messages idle &gt;60s".
     */
    @Scheduled(fixedDelay = 300_000)
    void recoverPendingMessages() {
        try {
            PendingMessagesSummary summary = redisTemplate.opsForStream()
                    .pending(STREAM_KEY, CONSUMER_GROUP);
            if (summary == null || summary.getTotalPendingMessages() == 0) return;

            log.info("Checking pending messages: count={}", summary.getTotalPendingMessages());

            // Fetch up to 10 pending messages for this consumer
            PendingMessages pending = redisTemplate.opsForStream()
                    .pending(STREAM_KEY, Consumer.from(CONSUMER_GROUP, CONSUMER_NAME), Range.unbounded(), 10L);
            if (pending == null || pending.isEmpty()) return;

            for (PendingMessage pm : pending) {
                // Only reclaim messages idle longer than PENDING_MIN_IDLE
                if (pm.getElapsedTimeSinceLastDelivery().compareTo(PENDING_MIN_IDLE) < 0) continue;

                RecordId recordId = pm.getId();
                // Re-read the message content from the stream
                List<MapRecord<String, Object, Object>> msgs = redisTemplate.opsForStream()
                        .range(STREAM_KEY, Range.closed(recordId.getValue(), recordId.getValue()));

                if (msgs != null && !msgs.isEmpty()) {
                    log.info("Reclaiming idle pending message: id={}", recordId);
                    processRecord(msgs.get(0));
                }
            }
        } catch (Exception e) {
            log.error("Error during pending message recovery: {}", e.getMessage(), e);
        }
    }

    // ── Record processing ─────────────────────────────────────────────────────

    private void processRecord(MapRecord<String, Object, Object> record) {
        Map<Object, Object> body = record.getValue();
        String messageId = record.getId().getValue();

        String type = str(body, "type");
        if (!"strava_activity".equals(type)) {
            // Unknown job type — acknowledge and skip
            ack(messageId);
            return;
        }

        UUID   userId    = UUID.fromString(str(body, "userId"));
        String sourceId  = str(body, "sourceId");
        String eventType = str(body, "eventType");
        int    attempt   = parseAttempt(str(body, "attempt"));

        log.debug("Processing job: type={} userId={} sourceId={} eventType={} attempt={}",
                type, userId, sourceId, eventType, attempt);

        try {
            syncService.process(userId, sourceId, eventType);
            ack(messageId);
            log.info("Job processed successfully: sourceId={}", sourceId);
        } catch (Exception e) {
            log.error("Job processing failed (attempt {}): sourceId={} error={}",
                    attempt + 1, sourceId, e.getMessage());

            ack(messageId); // Remove from pending list regardless

            if (attempt + 1 < MAX_ATTEMPTS) {
                // Re-enqueue with incremented attempt counter
                jobQueuePort.enqueue(userId, sourceId, eventType, attempt + 1);
                log.info("Re-queued job: sourceId={} nextAttempt={}", sourceId, attempt + 1);
            } else {
                // Max retries exceeded → dead letter
                jobQueuePort.sendToDeadLetter(userId, sourceId, eventType, e.getMessage());
                log.error("Job moved to dead letter after {} attempts: sourceId={}", attempt + 1, sourceId);
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void ack(String messageId) {
        try {
            redisTemplate.opsForStream().acknowledge(STREAM_KEY, CONSUMER_GROUP, messageId);
        } catch (Exception e) {
            log.warn("Failed to acknowledge message {}: {}", messageId, e.getMessage());
        }
    }

    private static String str(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "";
    }

    private static int parseAttempt(String val) {
        try { return Integer.parseInt(val); } catch (NumberFormatException e) { return 0; }
    }
}
