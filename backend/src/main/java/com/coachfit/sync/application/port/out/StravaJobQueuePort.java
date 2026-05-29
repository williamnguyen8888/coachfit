package com.coachfit.sync.application.port.out;

import java.util.UUID;

/**
 * Output port: push sync jobs onto the Redis Stream queue.
 *
 * <p>See docs/06-sync-engine-spec.md §Redis Stream Design.
 * Stream name: {@code sync:jobs}, consumer group: {@code sync-workers}.
 */
public interface StravaJobQueuePort {

    /**
     * Enqueues a Strava activity sync job.
     *
     * @param userId           CoachFit user UUID
     * @param stravaActivityId Strava's numeric activity ID (as string)
     * @param eventType        "activity_created" | "activity_updated" | "activity_deleted"
     * @param attempt          0-based retry count (0 = first attempt)
     */
    void enqueue(UUID userId, String stravaActivityId, String eventType, int attempt);

    /**
     * Sends a failed job to the dead-letter stream ({@code sync:dead_letter})
     * after exceeding the max retry count.
     *
     * @param userId           CoachFit user UUID
     * @param stravaActivityId Strava's numeric activity ID (as string)
     * @param eventType        event type string
     * @param errorMessage     last error description
     */
    void sendToDeadLetter(UUID userId, String stravaActivityId, String eventType, String errorMessage);
}
