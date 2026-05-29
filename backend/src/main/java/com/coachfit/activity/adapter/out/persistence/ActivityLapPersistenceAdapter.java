package com.coachfit.activity.adapter.out.persistence;

import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * JPA adapter for {@link ActivityLapPersistencePort}.
 */
@Repository
class ActivityLapPersistenceAdapter implements ActivityLapPersistencePort {

    private final ActivityLapJpaRepository repo;

    ActivityLapPersistenceAdapter(ActivityLapJpaRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public void replaceAll(UUID activityId, List<LapData> laps) {
        repo.deleteByActivityId(activityId);
        for (LapData lap : laps) {
            ActivityLapEntity entity = new ActivityLapEntity(activityId, lap.lapIndex());
            entity.startTime        = lap.startTime();
            entity.durationSeconds  = lap.durationSeconds();
            entity.distanceMeters   = lap.distanceMeters();
            entity.avgHeartRate     = lap.avgHeartRate();
            entity.maxHeartRate     = lap.maxHeartRate();
            entity.avgPower         = lap.avgPower();
            entity.maxPower         = lap.maxPower();
            entity.avgCadence       = lap.avgCadence();
            entity.avgPace          = lap.avgPace();
            entity.elevationGain    = lap.elevationGain();
            repo.save(entity);
        }
    }

    @Override
    public List<LapData> findByActivityId(UUID activityId) {
        return repo.findByActivityIdOrderByLapIndexAsc(activityId)
                .stream()
                .map(e -> new LapData(
                        e.lapIndex, e.startTime, e.durationSeconds,
                        e.distanceMeters, e.avgHeartRate, e.maxHeartRate,
                        e.avgPower, e.maxPower, e.avgCadence, e.avgPace,
                        e.elevationGain))
                .toList();
    }
}
