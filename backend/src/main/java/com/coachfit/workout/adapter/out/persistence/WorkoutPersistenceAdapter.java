package com.coachfit.workout.adapter.out.persistence;

import com.coachfit.workout.application.port.out.WorkoutPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link WorkoutPersistencePort}.
 */
@Repository
class WorkoutPersistenceAdapter implements WorkoutPersistencePort {

    private final WorkoutJpaRepository repo;
    private final JdbcClient           jdbcClient;

    WorkoutPersistenceAdapter(WorkoutJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID save(UUID userId, String name, String sport, String description,
                     Integer estimatedDurationSeconds, BigDecimal estimatedTss,
                     String stepsJson, String[] tags, boolean isTemplate,
                     boolean isPublic, String source) {

        WorkoutEntity entity      = new WorkoutEntity(userId, name, sport, stepsJson);
        entity.description        = description;
        entity.estimatedDurationSeconds = estimatedDurationSeconds;
        entity.estimatedTss       = estimatedTss;
        entity.tags               = tags;
        entity.isTemplate         = isTemplate;
        entity.isPublic           = isPublic;
        entity.source             = source;
        return repo.save(entity).id;
    }

    @Override
    public Optional<WorkoutSummary> findById(UUID workoutId) {
        return repo.findById(workoutId)
                .filter(e -> e.deletedAt == null)
                .map(this::toSummary);
    }

    @Override
    public List<WorkoutSummary> findByUserId(UUID userId) {
        return repo.findByUserIdAndDeletedAtIsNull(userId).stream().map(this::toSummary).toList();
    }

    @Override
    public List<WorkoutSummary> findTemplates() {
        return repo.findByIsTemplateAndDeletedAtIsNull(true).stream().map(this::toSummary).toList();
    }

    @Override
    @Transactional
    public void softDelete(UUID workoutId) {
        jdbcClient.sql("""
                UPDATE workouts
                   SET deleted_at = now(), updated_at = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", workoutId)
                .update();
    }

    private WorkoutSummary toSummary(WorkoutEntity e) {
        return new WorkoutSummary(e.id, e.userId, e.name, e.sport,
                e.steps, e.isTemplate, e.isPublic, e.source);
    }
}
