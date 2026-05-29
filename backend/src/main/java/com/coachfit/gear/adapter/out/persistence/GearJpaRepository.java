package com.coachfit.gear.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link GearEntity}.
 */
interface GearJpaRepository extends JpaRepository<GearEntity, UUID> {

    List<GearEntity> findByUserIdAndIsActiveTrue(UUID userId);
}
