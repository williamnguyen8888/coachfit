package com.coachfit.sync.adapter.out.persistence;

import com.coachfit.sync.application.port.out.SyncSupportQueryPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link SyncSupportQueryPort}.
 *
 * <p>Reads from {@code oauth_connections} (status surface) and
 * {@code sync_logs} (log surface) — both are read-only operations.
 */
@Repository
class SyncSupportQueryAdapter implements SyncSupportQueryPort {

    private final JdbcClient jdbcClient;

    SyncSupportQueryAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // ── oauth_connections ─────────────────────────────────────────────────────

    @Override
    public List<ConnectionRow> findConnectionsByUserId(UUID userId) {
        return jdbcClient.sql("""
                SELECT provider, sync_status, push_enabled, last_sync_at
                  FROM oauth_connections
                 WHERE user_id = :userId
                 ORDER BY provider
                """)
                .param("userId", userId)
                .query((rs, rowNum) -> new ConnectionRow(
                        rs.getString("provider"),
                        rs.getString("sync_status"),
                        rs.getBoolean("push_enabled"),
                        rs.getTimestamp("last_sync_at") != null
                                ? rs.getTimestamp("last_sync_at").toInstant() : null
                ))
                .list();
    }

    // ── sync_logs ─────────────────────────────────────────────────────────────

    @Override
    public List<SyncLogRow> findLogsByUserId(UUID userId, int page, int size) {
        return jdbcClient.sql("""
                SELECT id, provider, event_type, status, source_id,
                       activity_id, error_message, processed_at, created_at
                  FROM sync_logs
                 WHERE user_id = :userId
                 ORDER BY created_at DESC
                 LIMIT :size OFFSET :offset
                """)
                .param("userId", userId)
                .param("size",   size)
                .param("offset", (long) page * size)
                .query((rs, rowNum) -> new SyncLogRow(
                        rs.getObject("id",          UUID.class),
                        rs.getString("provider"),
                        rs.getString("event_type"),
                        rs.getString("status"),
                        rs.getString("source_id"),
                        rs.getObject("activity_id", UUID.class),
                        rs.getString("error_message"),
                        toInstant(rs, "processed_at"),
                        toInstant(rs, "created_at")
                ))
                .list();
    }

    @Override
    public long countLogsByUserId(UUID userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM sync_logs WHERE user_id = :userId")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Instant toInstant(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(col);
        return ts != null ? ts.toInstant() : null;
    }
}
