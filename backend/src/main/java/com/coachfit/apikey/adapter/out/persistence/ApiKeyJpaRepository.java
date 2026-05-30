package com.coachfit.apikey.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ApiKeyEntity}.
 */
interface ApiKeyJpaRepository extends JpaRepository<ApiKeyEntity, UUID> {

    List<ApiKeyEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<ApiKeyEntity> findByKeyHashAndIsActiveTrue(String keyHash);
}
