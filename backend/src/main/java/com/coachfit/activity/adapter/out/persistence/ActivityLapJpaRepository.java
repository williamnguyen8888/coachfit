package com.coachfit.activity.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ActivityLapEntity}.
 */
interface ActivityLapJpaRepository extends JpaRepository<ActivityLapEntity, UUID> {

    List<ActivityLapEntity> findByActivityIdOrderByLapIndexAsc(UUID activityId);

    @Modifying
    @Query("DELETE FROM ActivityLapEntity l WHERE l.activityId = :activityId")
    void deleteByActivityId(UUID activityId);
}
