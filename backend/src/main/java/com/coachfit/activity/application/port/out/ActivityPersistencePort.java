package com.coachfit.activity.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: activity persistence operations.
 *
 * <p>Services use this port; the JPA adapter in
 * {@code adapter.out.persistence} implements it.
 */
public interface ActivityPersistencePort {

    /**
     * Persists a new activity record.
     *
     * @return the generated UUID of the saved activity
     */
    UUID save(UUID userId,
              String source,
              String sourceId,
              String sport,
              String subSport,
              String name,
              Instant startedAt,
              int durationSeconds,
              BigDecimal distanceMeters,
              BigDecimal elevationGainMeters);

    Optional<ActivitySummary> findById(UUID activityId);

    /**
     * Checks whether an activity from a given source already exists (dedup guard).
     */
    boolean existsByUserSourceAndSourceId(UUID userId, String source, String sourceId);

    /**
     * Soft-deletes the activity (sets deleted_at = now()).
     */
    void softDelete(UUID activityId);

    // ── Read model returned by findById ──────────────────────────────────────

    record ActivitySummary(
            UUID    id,
            UUID    userId,
            String  source,
            String  sourceId,
            String  sport,
            String  name,
            Instant startedAt,
            int     durationSeconds,
            BigDecimal distanceMeters,
            UUID    gearId,
            Instant deletedAt
    ) {}
}
