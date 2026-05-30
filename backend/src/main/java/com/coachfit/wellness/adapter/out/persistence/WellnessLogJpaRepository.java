package com.coachfit.wellness.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link WellnessLogEntity}.
 */
interface WellnessLogJpaRepository extends JpaRepository<WellnessLogEntity, UUID> {

    Optional<WellnessLogEntity> findByUserIdAndDate(UUID userId, LocalDate date);

    java.util.List<WellnessLogEntity> findByUserIdAndDateBetweenOrderByDateDesc(
            UUID userId, LocalDate from, LocalDate to);
}
