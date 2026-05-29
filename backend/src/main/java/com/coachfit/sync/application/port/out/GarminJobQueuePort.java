package com.coachfit.sync.application.port.out;

import java.util.UUID;

/**
 * Output port: enqueue Garmin push processing jobs onto the Redis Stream.
 *
 * <p>All job types share the same stream ({@code sync:jobs}) and consumer group
 * ({@code sync-workers}) as Strava jobs (docs/06-sync-engine-spec.md §Redis Stream Design).
 * The {@code type} field in the job body determines which handler picks it up.
 *
 * <p>Job type constants:
 * <ul>
 *   <li>{@code garmin_dailies}         — health_daily_summaries upsert
 *   <li>{@code garmin_activity}        — activities upsert
 *   <li>{@code garmin_activity_details}— activity_streams upsert
 *   <li>{@code garmin_sleep}           — health_sleep_data upsert
 *   <li>{@code garmin_body}            — body composition → health_daily_summaries
 *   <li>{@code garmin_stress}          — stress → health_daily_summaries
 *   <li>{@code garmin_hrv}             — hrv → health_sleep_data
 *   <li>{@code garmin_pulseox}         — SpO2 → health_daily_summaries
 *   <li>{@code garmin_respiration}     — breathing rate → health_daily_summaries
 *   <li>{@code garmin_user_metrics}    — VO2max → health_daily_summaries
 * </ul>
 */
public interface GarminJobQueuePort {

    /**
     * Enqueues a Garmin push job for async processing.
     *
     * @param userId      CoachFit user UUID resolved from {@code userAccessToken}
     * @param jobType     one of the {@code garmin_*} type constants above
     * @param payloadJson serialised JSON of the single Garmin data element
     *                    (one item from the push array, not the whole batch)
     */
    void enqueue(UUID userId, String jobType, String payloadJson);

    /**
     * Moves a failed Garmin job to the dead-letter stream after max retries.
     *
     * @param userId       CoachFit user UUID
     * @param jobType      job type string
     * @param errorMessage last error description
     */
    void sendToDeadLetter(UUID userId, String jobType, String errorMessage);
}
