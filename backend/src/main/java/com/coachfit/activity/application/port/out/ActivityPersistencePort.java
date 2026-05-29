package com.coachfit.activity.application.port.out;

import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;
import com.coachfit.activity.domain.model.ParsedActivity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: activity record persistence (the {@code activities} table).
 *
 * <p>Streams and laps have their own dedicated ports
 * ({@link ActivityStreamPersistencePort} and {@link ActivityLapPersistencePort}).
 */
public interface ActivityPersistencePort {

    // ── Manual upload path ────────────────────────────────────────────────────

    /**
     * Fingerprint-based duplicate detection for the manual upload path.
     *
     * <p>Queries for an existing (non-deleted) activity for the user matching:
     * <ul>
     *   <li>same sport</li>
     *   <li>{@code started_at} within 60 seconds of {@code startedAt}</li>
     *   <li>{@code duration_seconds} within 60 seconds of {@code durationSeconds}</li>
     * </ul>
     *
     * @return the UUID of the existing activity if a match is found
     */
    Optional<UUID> findDuplicate(UUID userId, Instant startedAt, String sport, int durationSeconds);

    /**
     * Persists a new activity row for the manual upload path.
     * Source is set to {@code "manual"}, source_id to {@code null}.
     *
     * @param userId        authenticated user
     * @param parsed        normalised data from the parser
     * @param rawFilePath   MinIO object path (stored in {@code raw_file_path})
     * @param rawFileFormat "fit", "tcx", or "gpx"
     * @return the generated activity UUID
     */
    UUID saveActivity(UUID userId, ParsedActivity parsed, String rawFilePath, String rawFileFormat);

    /**
     * Loads a lightweight summary of an existing activity by ID.
     * Used to build the 201 response after a successful save.
     */
    ActivitySummary findById(UUID activityId);

    // ── Shared paths (also used by sync / read endpoints) ────────────────────

    /**
     * Persists a new activity from an external provider (Strava, Garmin, etc.).
     *
     * @return generated UUID
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

    /** Returns whether an activity row exists for the given source + sourceId. */
    boolean existsByUserSourceAndSourceId(UUID userId, String source, String sourceId);

    /** Soft-deletes an activity by setting {@code deleted_at = now()}. */
    void softDelete(UUID activityId);

    // ── Shared read model ─────────────────────────────────────────────────────

    record ActivitySummaryFull(
            UUID       id,
            UUID       userId,
            String     source,
            String     sourceId,
            String     sport,
            String     name,
            Instant    startedAt,
            int        durationSeconds,
            BigDecimal distanceMeters,
            UUID       gearId,
            Instant    deletedAt
    ) {}
}
