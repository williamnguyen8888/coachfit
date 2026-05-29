package com.coachfit.sync.application.port.out;

import java.time.Instant;
import java.util.UUID;

/**
 * Output port: sync log persistence.
 *
 * <p>Sync logs are append-only for audit purposes. Only status and
 * processed_at are mutated after initial creation.
 */
public interface SyncLogPersistencePort {

    /**
     * Creates a new sync log entry (status = 'pending').
     *
     * @return the generated log entry UUID
     */
    UUID create(UUID userId, String provider, String eventType,
                String sourceId, String payloadJson);

    /**
     * Updates the sync log after processing completes or fails.
     */
    void complete(UUID logId, String status, UUID activityId, String errorMessage);
}
