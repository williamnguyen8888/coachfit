package com.coachfit.activity.adapter.out.persistence;

import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.domain.model.ParsedActivity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link ActivityPersistencePort}.
 *
 * <p>JPA is used for inserts (via {@link ActivityEntity}).
 * JdbcClient handles the dedup check, soft-delete, and findById to avoid
 * pulling the full entity on hot paths.
 */
@Repository
class ActivityPersistenceAdapter implements ActivityPersistencePort {

    private final ActivityJpaRepository repo;
    private final JdbcClient            jdbcClient;

    ActivityPersistenceAdapter(ActivityJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    // ── Manual upload path ────────────────────────────────────────────────────

    @Override
    public Optional<UUID> findDuplicate(UUID userId, Instant startedAt, String sport, int durationSeconds) {
        return jdbcClient.sql("""
                SELECT id FROM activities
                WHERE user_id = :userId
                  AND sport   = :sport
                  AND started_at BETWEEN :from AND :to
                  AND ABS(duration_seconds - :duration) < 60
                  AND deleted_at IS NULL
                LIMIT 1
                """)
                .param("userId",   userId)
                .param("sport",    sport)
                .param("from",     startedAt.minusSeconds(60))
                .param("to",       startedAt.plusSeconds(60))
                .param("duration", durationSeconds)
                .query(UUID.class)
                .optional();
    }

    @Override
    @Transactional
    public UUID saveActivity(UUID userId, ParsedActivity parsed, String rawFilePath, String rawFileFormat) {
        ActivityEntity e = new ActivityEntity(userId, "manual", null,
                parsed.sport(), parsed.name(), parsed.startedAt(), parsed.durationSeconds());

        e.subSport            = parsed.subSport();
        e.movingTimeSeconds   = parsed.movingTimeSeconds();
        e.distanceMeters      = parsed.distanceMeters();
        e.elevationGainMeters = parsed.elevationGainMeters();
        e.calories            = parsed.calories();
        e.avgHeartRate        = parsed.avgHeartRate();
        e.maxHeartRate        = parsed.maxHeartRate();
        e.avgPower            = parsed.avgPower();
        e.maxPower            = parsed.maxPower();
        e.avgCadence          = parsed.avgCadence();
        e.avgSpeed            = parsed.avgSpeed();
        e.startLat            = parsed.startLat() != null
                ? BigDecimal.valueOf(parsed.startLat()).setScale(7, RoundingMode.HALF_UP) : null;
        e.startLng            = parsed.startLng() != null
                ? BigDecimal.valueOf(parsed.startLng()).setScale(7, RoundingMode.HALF_UP) : null;
        e.rawFilePath         = rawFilePath;
        e.rawFileFormat       = rawFileFormat;

        return repo.save(e).id;
    }

    @Override
    public ActivitySummary findById(UUID activityId) {
        return repo.findById(activityId)
                .filter(e -> e.deletedAt == null)
                .map(e -> new ActivitySummary(
                        e.id, e.name, e.sport, e.startedAt,
                        e.durationSeconds,
                        e.distanceMeters != null ? e.distanceMeters.doubleValue() : null,
                        e.source, e.rawFileFormat))
                .orElseThrow(() -> new IllegalStateException("Activity not found after save: " + activityId));
    }

    // ── Shared paths ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID save(UUID userId,
                     String source,
                     String sourceId,
                     String sport,
                     String subSport,
                     String name,
                     Instant startedAt,
                     int durationSeconds,
                     BigDecimal distanceMeters,
                     BigDecimal elevationGainMeters) {

        ActivityEntity entity = new ActivityEntity(userId, source, sourceId, sport, name,
                startedAt, durationSeconds);
        entity.subSport            = subSport;
        entity.distanceMeters      = distanceMeters;
        entity.elevationGainMeters = elevationGainMeters;
        return repo.save(entity).id;
    }

    @Override
    public boolean existsByUserSourceAndSourceId(UUID userId, String source, String sourceId) {
        return jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM activities
                    WHERE user_id   = :userId
                      AND source    = :source
                      AND source_id = :sourceId
                      AND deleted_at IS NULL
                )
                """)
                .param("userId",   userId)
                .param("source",   source)
                .param("sourceId", sourceId)
                .query(Boolean.class)
                .single();
    }

    @Override
    @Transactional
    public void softDelete(UUID activityId) {
        jdbcClient.sql("""
                UPDATE activities
                   SET deleted_at = now(), updated_at = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", activityId)
                .update();
    }
}
