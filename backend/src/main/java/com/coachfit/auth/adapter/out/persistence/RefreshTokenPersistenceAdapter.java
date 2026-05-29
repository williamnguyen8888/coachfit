package com.coachfit.auth.adapter.out.persistence;

import com.coachfit.auth.application.port.out.RefreshTokenPersistencePort;
import com.coachfit.auth.domain.model.RefreshToken;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
class RefreshTokenPersistenceAdapter implements RefreshTokenPersistencePort {

    private final RefreshTokenJpaRepository repo;

    RefreshTokenPersistenceAdapter(RefreshTokenJpaRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public void create(UUID userId, String tokenHash, Instant expiresAt) {
        repo.save(new RefreshTokenEntity(userId, tokenHash, expiresAt));
    }

    @Override
    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
        return repo.findByTokenHash(tokenHash).map(this::toDomain);
    }

    @Override
    @Transactional
    public void revokeByTokenHash(String tokenHash) {
        repo.revokeByTokenHash(tokenHash, Instant.now());
    }

    @Override
    @Transactional
    public void revokeAllForUser(UUID userId) {
        repo.revokeAllForUser(userId, Instant.now());
    }

    private RefreshToken toDomain(RefreshTokenEntity e) {
        return new RefreshToken(e.id, e.userId, e.tokenHash, e.expiresAt, e.revokedAt);
    }
}
