package com.coachfit.athlete.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface AthleteProfileJpaRepository extends JpaRepository<AthleteProfileEntity, UUID> {

    Optional<AthleteProfileEntity> findByUserId(UUID userId);
}
