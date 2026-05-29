package com.coachfit.activity.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ActivityStreamEntity}.
 */
interface ActivityStreamJpaRepository extends JpaRepository<ActivityStreamEntity, UUID> {

    Optional<ActivityStreamEntity> findByActivityId(UUID activityId);
}
