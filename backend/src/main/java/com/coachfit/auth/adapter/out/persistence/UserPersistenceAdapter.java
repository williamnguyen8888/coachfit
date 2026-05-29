package com.coachfit.auth.adapter.out.persistence;

import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.model.AuthUser;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link UserPersistencePort}.
 *
 * <p>JPA is used for user CRUD. {@link JdbcClient} is used for subscription operations
 * (cross-module table) to avoid importing JPA entities from the subscription module.
 */
@Repository
class UserPersistenceAdapter implements UserPersistencePort {

    private final UserJpaRepository userRepo;
    private final JdbcClient        jdbcClient;

    UserPersistenceAdapter(UserJpaRepository userRepo, JdbcClient jdbcClient) {
        this.userRepo   = userRepo;
        this.jdbcClient = jdbcClient;
    }

    // ── UserPersistencePort ───────────────────────────────────────────────────

    @Override
    public boolean existsByEmail(String email) {
        return userRepo.existsByEmailAndDeletedAtIsNull(email);
    }

    @Override
    public Optional<AuthUser> findByEmail(String email) {
        return userRepo.findByEmailAndDeletedAtIsNull(email)
                .map(e -> toDomain(e, loadTier(e.id)));
    }

    @Override
    public Optional<AuthUser> findById(UUID id) {
        return userRepo.findById(id)
                .filter(e -> e.deletedAt == null)
                .map(e -> toDomain(e, loadTier(e.id)));
    }

    @Override
    public Optional<String> findPasswordHashByEmail(String email) {
        return userRepo.findByEmailAndDeletedAtIsNull(email)
                .map(e -> e.passwordHash);
    }

    @Override
    @Transactional
    public AuthUser createUser(String email, String fullName, String passwordHash) {
        UserEntity entity = new UserEntity(email, fullName, passwordHash);
        entity = userRepo.save(entity);

        // Create free subscription — JDBC to avoid importing subscription module JPA entity.
        jdbcClient.sql("""
                INSERT INTO subscriptions (user_id, tier, status, created_at, updated_at)
                VALUES (:userId, 'free', 'active', now(), now())
                """)
                .param("userId", entity.id)
                .update();

        return toDomain(entity, "free");
    }

    @Override
    @Transactional
    public void updateUserFields(UUID userId, String fullName, String settings) {
        // Build a dynamic SET clause: only update non-null fields.
        StringBuilder sql = new StringBuilder("UPDATE users SET updated_at = now()");
        if (fullName != null) sql.append(", full_name = :fullName");
        if (settings != null) sql.append(", settings  = :settings::jsonb");
        sql.append(" WHERE id = :id AND deleted_at IS NULL");

        var stmt = jdbcClient.sql(sql.toString()).param("id", userId);
        if (fullName != null) stmt = stmt.param("fullName", fullName);
        if (settings != null) stmt = stmt.param("settings", settings);
        stmt.update();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String loadTier(UUID userId) {
        return jdbcClient.sql("SELECT tier FROM subscriptions WHERE user_id = :id")
                .param("id", userId)
                .query(String.class)
                .optional()
                .orElse("free");
    }

    private AuthUser toDomain(UserEntity e, String tier) {
        return new AuthUser(e.id, e.email, e.fullName, e.role, tier);
    }
}
