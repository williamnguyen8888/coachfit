package com.coachfit.auth.adapter.out.persistence;

import com.coachfit.auth.application.port.out.ApiKeyPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA adapter implementing {@link ApiKeyPersistencePort}.
 *
 * <p>{@code findActiveByHash} updates {@code last_used_at} inside the same transaction
 * so every verified call is transparently tracked.
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
    public UUID create(UUID userId, String keyHash, String keyPrefix, String name, Instant expiresAt) {
        ApiKeyEntity entity = new ApiKeyEntity(userId, keyHash, keyPrefix, name, expiresAt);
        return repo.save(entity).id;
    }

    @Override
    @Transactional
    public Optional<ApiKeySummary> findActiveByHash(String keyHash) {
        return repo.findByKeyHashAndIsActiveTrue(keyHash).map(e -> {
            repo.updateLastUsedAt(e.id, Instant.now());
            return new ApiKeySummary(e.id, e.userId, e.keyPrefix, e.name, e.expiresAt, e.isActive);
        });
    }

    @Override
    @Transactional
    public void revoke(UUID keyId) {
        jdbcClient.sql("UPDATE api_keys SET is_active = false WHERE id = :id")
                .param("id", keyId)
                .update();
    }
}
