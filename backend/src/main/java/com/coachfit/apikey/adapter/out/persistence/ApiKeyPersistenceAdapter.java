package com.coachfit.apikey.adapter.out.persistence;

import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link ApiKeyPersistencePort}.
 *
 * <p>JPA is used for standard CRUD; JdbcClient for the targeted
 * {@code touchLastUsed} update to avoid loading the full entity.
 */
@Repository
class ApiKeyPersistenceAdapter implements ApiKeyPersistencePort {

    private final ApiKeyJpaRepository repo;
    private final JdbcClient          jdbcClient;

    ApiKeyPersistenceAdapter(ApiKeyJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID save(UUID userId, String keyHash, String keyPrefix, String name, Instant expiresAt) {
        return repo.save(new ApiKeyEntity(userId, keyHash, keyPrefix, name, expiresAt)).id;
    }

    @Override
    public List<ApiKeyRow> findAllByUserId(UUID userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toRow)
                .toList();
    }

    @Override
    public Optional<ApiKeyRow> findActiveByKeyHash(String keyHash) {
        return repo.findByKeyHashAndIsActiveTrue(keyHash)
                .filter(e -> e.expiresAt == null || e.expiresAt.isAfter(Instant.now()))
                .map(this::toRow);
    }

    @Override
    @Transactional
    public void revoke(UUID keyId) {
        repo.findById(keyId).ifPresent(e -> {
            e.isActive = false;
            repo.save(e);
        });
    }

    @Override
    @Transactional
    public void touchLastUsed(UUID keyId) {
        jdbcClient.sql("UPDATE api_keys SET last_used_at = now() WHERE id = :id")
                .param("id", keyId)
                .update();
    }

    private ApiKeyRow toRow(ApiKeyEntity e) {
        return new ApiKeyRow(e.id, e.userId, e.keyHash, e.keyPrefix, e.name,
                e.isActive, e.lastUsedAt, e.expiresAt, e.createdAt);
    }
}
