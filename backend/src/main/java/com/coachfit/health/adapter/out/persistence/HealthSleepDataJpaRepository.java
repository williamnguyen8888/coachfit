package com.coachfit.health.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link HealthSleepDataEntity}.
 */
interface HealthSleepDataJpaRepository extends JpaRepository<HealthSleepDataEntity, UUID> {

    Optional<HealthSleepDataEntity> findByUserIdAndSourceAndDate(
            UUID userId, String source, LocalDate date);

    java.util.List<HealthSleepDataEntity> findByUserIdAndDateBetweenOrderByDateDesc(
            UUID userId, LocalDate from, LocalDate to);

    java.util.Optional<HealthSleepDataEntity> findFirstByUserIdAndSourceAndDateLessThanEqualOrderByDateDesc(
            UUID userId, String source, LocalDate asOf);
}
