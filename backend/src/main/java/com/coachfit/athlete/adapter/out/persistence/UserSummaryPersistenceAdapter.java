package com.coachfit.athlete.adapter.out.persistence;

import com.coachfit.athlete.application.port.out.UserSummaryPersistencePort;
import com.coachfit.athlete.domain.model.UserSummary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter for reading / partially updating {@code users} table
 * from within the athlete module.
 *
 * <p>Does NOT import any auth-module JPA entities or ports — maintains
 * module boundary {@code athlete → shared} only.
 */
@Repository
class UserSummaryPersistenceAdapter implements UserSummaryPersistencePort {

    private final JdbcClient jdbcClient;

    UserSummaryPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Optional<UserSummary> findById(UUID userId) {
        return jdbcClient.sql("""
                SELECT u.id, u.email, u.full_name, u.role,
                       COALESCE(s.tier, 'free') AS tier
                FROM users u
                LEFT JOIN subscriptions s
                       ON s.user_id = u.id
                      AND s.status  = 'active'
                WHERE u.id = :id
                  AND u.deleted_at IS NULL
                """)
                .param("id", userId)
                .query((rs, rowNum) -> new UserSummary(
                        rs.getObject("id", UUID.class),
                        rs.getString("email"),
                        rs.getString("full_name"),
                        rs.getString("role"),
                        rs.getString("tier")
                ))
                .optional();
    }

    @Override
    @Transactional
    public void updateUserFields(UUID userId, String fullName, String settings) {
        StringBuilder sql = new StringBuilder("UPDATE users SET updated_at = now()");
        if (fullName != null) sql.append(", full_name = :fullName");
        if (settings != null) sql.append(", settings  = :settings::jsonb");
        sql.append(" WHERE id = :id AND deleted_at IS NULL");

        var stmt = jdbcClient.sql(sql.toString()).param("id", userId);
        if (fullName != null) stmt = stmt.param("fullName", fullName);
        if (settings != null) stmt = stmt.param("settings", settings);
        stmt.update();
    }
}
