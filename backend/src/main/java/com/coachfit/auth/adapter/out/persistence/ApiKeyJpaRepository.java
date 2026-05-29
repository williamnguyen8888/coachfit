package com.coachfit.auth.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ApiKeyEntity}.
 */
interface ApiKeyJpaRepository extends JpaRepository<ApiKeyEntity, UUID> {

    Optional<ApiKeyEntity> findByKeyHashAndIsActiveTrue(String keyHash);

    @Modifying
    @Query("UPDATE ApiKeyEntity k SET k.lastUsedAt = :now WHERE k.id = :id")
    void updateLastUsedAt(UUID id, Instant now);
}
