package com.coachfit.sync.adapter.out.queue;

import com.coachfit.sync.application.port.out.GarminJobQueuePort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Redis Streams implementation of {@link GarminJobQueuePort}.
 *
 * <p>Jobs are appended to the shared {@code sync:jobs} stream using {@code XADD}.
 * The same consumer group ({@code sync-workers}) handles both Strava and Garmin jobs;
 * the {@code type} field in the payload determines which handler processes each message.
 *
 * <p>Job payload format (docs/06-sync-engine-spec.md §Redis Stream Design):
 * <pre>
 * {
 *   "type":      "garmin_dailies",    // or garmin_activity, garmin_sleep, etc.
 *   "userId":    "uuid",
 *   "provider":  "garmin",
 *   "payload":   "{...}",             // single Garmin data element as JSON string
 *   "attempt":   "0",
 *   "createdAt": "2025-03-15T06:30:00Z"
 * }
 * </pre>
 *
 * <p>Failed messages are moved to {@code sync:dead_letter} after max retries.
 */
@Component
class RedisStreamGarminJobQueueAdapter implements GarminJobQueuePort {

    private static final Logger log = LoggerFactory.getLogger(RedisStreamGarminJobQueueAdapter.class);

    private final StringRedisTemplate redisTemplate;

    RedisStreamGarminJobQueueAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void enqueue(UUID userId, String jobType, String payloadJson) {
        Map<String, String> body = Map.of(
                "type",      jobType,
                "userId",    userId.toString(),
                "provider",  "garmin",
                "payload",   payloadJson != null ? payloadJson : "{}",
                "attempt",   "0",
                "createdAt", Instant.now().toString()
        );
        MapRecord<String, String, String> record =
                StreamRecords.mapBacked(body).withStreamKey(RedisStreamJobQueueAdapter.STREAM_KEY);
        redisTemplate.opsForStream().add(record);
        log.debug("Enqueued Garmin job: type={} userId={}", jobType, userId);
    }

    @Override
    public void sendToDeadLetter(UUID userId, String jobType, String errorMessage) {
        Map<String, String> body = Map.of(
                "type",         jobType,
                "userId",       userId.toString(),
                "provider",     "garmin",
                "errorMessage", errorMessage != null ? errorMessage : "",
                "failedAt",     Instant.now().toString()
        );
        MapRecord<String, String, String> record =
                StreamRecords.mapBacked(body).withStreamKey(RedisStreamJobQueueAdapter.DEAD_LETTER_KEY);
        redisTemplate.opsForStream().add(record);
        log.warn("Garmin job moved to dead letter: type={} userId={} error={}", jobType, userId, errorMessage);
    }
}
