package com.coachfit.gear.adapter.out.persistence;

import com.coachfit.gear.application.port.out.GearPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link GearPersistencePort}.
 *
 * <p>{@code recalculateTotalDistance} is a single SQL UPDATE that avoids
 * loading all activity rows into Java — keeps the aggregate correct atomically.
 */
@Repository
class GearPersistenceAdapter implements GearPersistencePort {

    private final GearJpaRepository repo;
    private final JdbcClient        jdbcClient;

    GearPersistenceAdapter(GearJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID save(UUID userId, String name, String sport, String type) {
        return repo.save(new GearEntity(userId, name, sport, type)).id;
    }

    @Override
    public Optional<GearSummary> findById(UUID gearId) {
        return repo.findById(gearId).map(this::toSummary);
    }

    @Override
    public List<GearSummary> findActiveByUserId(UUID userId) {
        return repo.findByUserIdAndIsActiveTrue(userId).stream().map(this::toSummary).toList();
    }

    @Override
    @Transactional
    public void recalculateTotalDistance(UUID gearId) {
        jdbcClient.sql("""
                UPDATE gear
                   SET total_distance_meters = (
                       SELECT COALESCE(SUM(distance_meters), 0)
                         FROM activities
                        WHERE gear_id = :gearId
                          AND deleted_at IS NULL
                   )
                 WHERE id = :gearId
                """)
                .param("gearId", gearId)
                .update();
    }

    @Override
    @Transactional
    public void retire(UUID gearId) {
        jdbcClient.sql("UPDATE gear SET is_active = false WHERE id = :id")
                .param("id", gearId)
                .update();
    }

    private GearSummary toSummary(GearEntity e) {
        return new GearSummary(e.id, e.userId, e.name, e.sport, e.type,
                e.isActive, e.totalDistanceMeters);
    }
}
