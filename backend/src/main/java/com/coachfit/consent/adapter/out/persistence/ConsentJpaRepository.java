package com.coachfit.consent.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface ConsentJpaRepository extends JpaRepository<ConsentEntity, UUID> {

    /** Returns all consent records for a user, newest first. */
    List<ConsentEntity> findByUserIdOrderByGrantedAtDesc(UUID userId);
}
