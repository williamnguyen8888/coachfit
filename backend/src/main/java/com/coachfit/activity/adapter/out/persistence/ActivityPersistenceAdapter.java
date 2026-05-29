package com.coachfit.activity.adapter.out.persistence;

import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link ActivityPersistencePort}.
 *
 * <p>JPA is used for inserts (via {@link ActivityEntity}).
 * JdbcClient handles the dedup check and soft-delete to avoid pulling
 * the full entity on hot paths.
 */
@Repository
class ActivityPersistenceAdapter implements ActivityPersistencePort {

    private final ActivityJpaRepository repo;
    private final JdbcClient            jdbcClient;

    ActivityPersistenceAdapter(ActivityJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

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
        entity.subSport             = subSport;
        entity.distanceMeters       = distanceMeters;
        entity.elevationGainMeters  = elevationGainMeters;
        return repo.save(entity).id;
    }

    @Override
    public Optional<ActivitySummary> findById(UUID activityId) {
        return repo.findById(activityId)
                .filter(e -> e.deletedAt == null)
                .map(e -> new ActivitySummary(
                        e.id, e.userId, e.source, e.sourceId, e.sport, e.name,
                        e.startedAt, e.durationSeconds, e.distanceMeters,
                        e.gearId, e.deletedAt));
    }

    @Override
    public boolean existsByUserSourceAndSourceId(UUID userId, String source, String sourceId) {
        return jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM activities
                    WHERE user_id = :userId
                      AND source   = :source
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
