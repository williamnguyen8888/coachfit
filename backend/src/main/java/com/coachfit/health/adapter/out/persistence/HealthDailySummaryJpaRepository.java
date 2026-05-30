package com.coachfit.health.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link HealthDailySummaryEntity}.
 */
interface HealthDailySummaryJpaRepository extends JpaRepository<HealthDailySummaryEntity, UUID> {

    Optional<HealthDailySummaryEntity> findByUserIdAndSourceAndDate(
            UUID userId, String source, LocalDate date);

    java.util.List<HealthDailySummaryEntity> findByUserIdAndDateBetweenOrderByDateDesc(
            UUID userId, LocalDate from, LocalDate to);

    java.util.Optional<HealthDailySummaryEntity> findFirstByUserIdAndSourceAndDateLessThanEqualOrderByDateDesc(
            UUID userId, String source, LocalDate asOf);
}
