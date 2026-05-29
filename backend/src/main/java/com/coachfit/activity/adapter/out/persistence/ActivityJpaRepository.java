package com.coachfit.activity.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ActivityEntity}.
 */
interface ActivityJpaRepository extends JpaRepository<ActivityEntity, UUID> {
}
