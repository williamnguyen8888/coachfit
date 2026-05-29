package com.coachfit.wellness.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link TrainingLoadEntity}.
 */
interface TrainingLoadJpaRepository extends JpaRepository<TrainingLoadEntity, UUID> {

    Optional<TrainingLoadEntity> findByUserIdAndSportAndDate(UUID userId, String sport, LocalDate date);

    List<TrainingLoadEntity> findByUserIdAndSportAndDateBetweenOrderByDateAsc(
            UUID userId, String sport, LocalDate from, LocalDate to);
}
