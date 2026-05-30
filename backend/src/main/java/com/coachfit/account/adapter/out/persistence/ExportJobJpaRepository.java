package com.coachfit.account.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface ExportJobJpaRepository extends JpaRepository<ExportJobEntity, UUID> {

    /** Returns the most recently created job for the user. */
    Optional<ExportJobEntity> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
}
