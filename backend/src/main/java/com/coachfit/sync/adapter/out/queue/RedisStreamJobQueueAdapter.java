package com.coachfit.sync.adapter.out.queue;

import com.coachfit.sync.application.port.out.StravaJobQueuePort;
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
 * Redis Streams implementation of {@link StravaJobQueuePort}.
 *
 * <p>Jobs are appended to the {@code sync:jobs} stream using {@code XADD}.
 * The consumer group {@code sync-workers} is created on application start
 * by {@link com.coachfit.sync.adapter.in.StravaJobConsumer}.
 *
 * <p>Job payload format (docs/06-sync-engine-spec.md §Redis Stream Design):
 * <pre>
 * {
 *   "type":        "strava_activity",
 *   "userId":      "uuid",
 *   "provider":    "strava",
 *   "sourceId":    "12345",
 *   "eventType":   "activity_created",
 *   "attempt":     "0",
 *   "createdAt":   "2025-03-15T06:30:00Z"
 * }
 * </pre>
 *
 * <p>Failed messages are moved to {@code sync:dead_letter} after max retries.
 */
@Component
class RedisStreamJobQueueAdapter implements StravaJobQueuePort {

    private static final Logger log = LoggerFactory.getLogger(RedisStreamJobQueueAdapter.class);

    static final String STREAM_KEY      = "sync:jobs";
    static final String DEAD_LETTER_KEY = "sync:dead_letter";

    private final StringRedisTemplate redisTemplate;

    RedisStreamJobQueueAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void enqueue(UUID userId, String stravaActivityId, String eventType, int attempt) {
        Map<String, String> body = Map.of(
                "type",       "strava_activity",
                "userId",     userId.toString(),
                "provider",   "strava",
                "sourceId",   stravaActivityId,
                "eventType",  eventType,
                "attempt",    String.valueOf(attempt),
                "createdAt",  Instant.now().toString()
        );

        MapRecord<String, String, String> record = StreamRecords.mapBacked(body).withStreamKey(STREAM_KEY);
        redisTemplate.opsForStream().add(record);
        log.debug("Enqueued Strava job: userId={} activityId={} eventType={} attempt={}",
                userId, stravaActivityId, eventType, attempt);
    }

    @Override
    public void sendToDeadLetter(UUID userId, String stravaActivityId, String eventType, String errorMessage) {
        Map<String, String> body = Map.of(
                "type",         "strava_activity",
                "userId",       userId.toString(),
                "provider",     "strava",
                "sourceId",     stravaActivityId,
                "eventType",    eventType,
                "errorMessage", errorMessage != null ? errorMessage : "",
                "failedAt",     Instant.now().toString()
        );

        MapRecord<String, String, String> record = StreamRecords.mapBacked(body).withStreamKey(DEAD_LETTER_KEY);
        redisTemplate.opsForStream().add(record);
        log.warn("Job moved to dead letter: userId={} activityId={} eventType={} error={}",
                userId, stravaActivityId, eventType, errorMessage);
    }
}
