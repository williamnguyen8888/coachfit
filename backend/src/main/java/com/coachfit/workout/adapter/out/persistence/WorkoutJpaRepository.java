package com.coachfit.workout.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link WorkoutEntity}.
 */
interface WorkoutJpaRepository extends JpaRepository<WorkoutEntity, UUID> {

    List<WorkoutEntity> findByUserIdAndDeletedAtIsNull(UUID userId);

    List<WorkoutEntity> findByIsTemplateAndDeletedAtIsNull(boolean isTemplate);
}
