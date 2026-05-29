package com.coachfit.activity.application.port.out;

import com.coachfit.activity.application.port.in.GetActivityUseCase.ActivityDetail;
import com.coachfit.activity.application.port.in.GetActivityUseCase.GearRef;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase.ActivityListItem;
import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;
import com.coachfit.activity.domain.model.ParsedActivity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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

    /**
     * Returns the activity UUID for the given source + sourceId (used on update events to
     * locate the existing row before merging new data).
     */
    Optional<UUID> findIdByUserSourceAndSourceId(UUID userId, String source, String sourceId);

    /**
     * Partially updates an activity row from a Strava "activity_updated" event.
     * Only non-null fields are applied.
     */
    void updateFromStrava(UUID activityId, String name, String description,
                          Integer avgHeartRate, Integer maxHeartRate,
                          Integer avgPower, Integer maxPower, Integer normalizedPower,
                          java.math.BigDecimal tss, java.math.BigDecimal intensityFactor,
                          Integer avgCadence, java.math.BigDecimal distanceMeters,
                          Integer calories, java.math.BigDecimal elevationGainMeters);

    /** Soft-deletes an activity by setting {@code deleted_at = now()}. */
    void softDelete(UUID activityId);

    /**
     * Returns the {@code raw_file_path} for a non-deleted activity owned by the user.
     * Returns empty if the activity has no raw file (e.g. synced from Strava without upload).
     */
    Optional<String> findRawFilePath(UUID userId, UUID activityId);

    // ── Read API ──────────────────────────────────────────────────────────────

    /**
     * Paginated, filterable list of a user's activities (non-deleted).
     *
     * @param userId    owner filter (required)
     * @param sport     optional sport filter
     * @param source    optional source filter
     * @param from      optional lower bound on started_at (inclusive)
     * @param to        optional upper bound on started_at (inclusive)
     * @param page      0-indexed page
     * @param size      page size
     * @param sortField field to sort by (e.g. "startedAt")
     * @param sortDir   "asc" or "desc"
     * @return matching items (may be empty)
     */
    List<ActivityListItem> list(UUID userId, String sport, String source,
                                Instant from, Instant to,
                                int page, int size,
                                String sortField, String sortDir);

    /**
     * Total count matching the list filters (for pagination metadata).
     */
    long count(UUID userId, String sport, String source, Instant from, Instant to);

    /**
     * Full detail view used by GET /activities/{id}.
     * Returns empty if the activity is deleted or belongs to a different user.
     *
     * <p>The {@code gear} field is populated from the {@code gear} table when
     * {@code gear_id} is set, otherwise null.
     */
    Optional<ActivityDetail> findDetailById(UUID userId, UUID activityId);

    // ── Update API ────────────────────────────────────────────────────────────

    /**
     * Applies a user-editable partial update (name, description, gearId).
     * Null parameters leave the existing value unchanged.
     *
     * @param activityId target activity (must belong to userId and not be deleted)
     * @param userId     owner — used for safety check in the WHERE clause
     * @param name       new name, or null to keep current
     * @param description new description, or null to keep current
     * @param gearId     new gear reference, or null to keep current
     * @return true if the row was found and updated
     */
    boolean updateUserFields(UUID activityId, UUID userId,
                             String name, String description, UUID gearId);

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
