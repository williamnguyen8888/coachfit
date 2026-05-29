package com.coachfit.activity.adapter.out.persistence;

import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA adapter for {@link ActivityStreamPersistencePort}.
 *
 * <p>Uses JPA for both upsert and read. The UNIQUE constraint on {@code activity_id}
 * ensures at most one row per activity; we delete + insert to replace (simpler
 * than a MERGE with array literals).
 */
@Repository
class ActivityStreamPersistenceAdapter implements ActivityStreamPersistencePort {

    private final ActivityStreamJpaRepository repo;

    ActivityStreamPersistenceAdapter(ActivityStreamJpaRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public void upsert(UUID activityId, StreamData data) {
        repo.findByActivityId(activityId).ifPresent(repo::delete);

        ActivityStreamEntity entity = new ActivityStreamEntity(activityId);
        entity.timestamps   = data.timestamps();
        entity.heartRate    = data.heartRate();
        entity.power        = data.power();
        entity.cadence      = data.cadence();
        entity.speed        = data.speed();
        entity.altitude     = data.altitude();
        entity.latitude     = data.latitude();
        entity.longitude    = data.longitude();
        entity.distance     = data.distance();
        entity.temperature  = data.temperature();
        entity.grade        = data.grade();
        repo.save(entity);
    }

    @Override
    public Optional<StreamData> findByActivityId(UUID activityId) {
        return repo.findByActivityId(activityId).map(this::toDomain);
    }

    private StreamData toDomain(ActivityStreamEntity e) {
        return new StreamData(
                e.timestamps, e.heartRate, e.power, e.cadence,
                e.speed, e.altitude, e.latitude, e.longitude,
                e.distance, e.temperature, e.grade);
    }
}
