package com.coachfit.athlete.adapter.out.persistence;

import com.coachfit.athlete.application.port.out.ConnectionsPersistencePort;
import com.coachfit.athlete.domain.model.OAuthConnection;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * JdbcClient-based adapter for {@code oauth_connections} — athlete read/disconnect only.
 *
 * <p>Token columns are <em>never selected</em> — this adapter only surfaces the
 * non-sensitive metadata fields needed for {@code GET /athlete/connections} and
 * {@code DELETE /athlete/connections/{provider}}.
 */
@Repository
class ConnectionsPersistenceAdapter implements ConnectionsPersistencePort {

    private final JdbcClient jdbcClient;

    ConnectionsPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // ── ConnectionsPersistencePort ────────────────────────────────────────────

    @Override
    public List<OAuthConnection> findActiveByUserId(UUID userId) {
        return jdbcClient.sql("""
                SELECT provider, sync_status, last_sync_at, push_enabled, created_at
                FROM oauth_connections
                WHERE user_id = :userId
                  AND sync_status != 'disconnected'
                ORDER BY created_at ASC
                """)
                .param("userId", userId)
                .query(this::mapRow)
                .list();
    }

    @Override
    public boolean existsActive(UUID userId, String provider) {
        return jdbcClient.sql("""
                SELECT COUNT(1) FROM oauth_connections
                WHERE user_id = :userId
                  AND provider = :provider
                  AND sync_status != 'disconnected'
                """)
                .param("userId",   userId)
                .param("provider", provider)
                .query(Integer.class)
                .single() > 0;
    }

    @Override
    @Transactional
    public void softDisconnect(UUID userId, String provider) {
        jdbcClient.sql("""
                UPDATE oauth_connections
                SET sync_status = 'disconnected',
                    updated_at  = now()
                WHERE user_id  = :userId
                  AND provider = :provider
                """)
                .param("userId",   userId)
                .param("provider", provider)
                .update();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private OAuthConnection mapRow(ResultSet rs, int rowNum) throws SQLException {
        Timestamp lastSyncTs = rs.getTimestamp("last_sync_at");
        Timestamp createdTs  = rs.getTimestamp("created_at");
        return new OAuthConnection(
                rs.getString("provider"),
                rs.getString("sync_status"),
                lastSyncTs  != null ? lastSyncTs.toInstant()  : null,
                rs.getBoolean("push_enabled"),
                createdTs   != null ? createdTs.toInstant()   : null
        );
    }
}
