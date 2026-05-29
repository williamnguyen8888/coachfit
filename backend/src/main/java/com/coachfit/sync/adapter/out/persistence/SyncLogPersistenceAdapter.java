package com.coachfit.sync.adapter.out.persistence;

import com.coachfit.sync.application.port.out.SyncLogPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * JdbcClient-based adapter implementing {@link SyncLogPersistencePort}.
 *
 * <p>Uses plain JDBC (no JPA entity) because sync_logs is append-only and
 * the full payload JSONB column makes JPA mapping cumbersome.
 */
@Repository
class SyncLogPersistenceAdapter implements SyncLogPersistencePort {

    private final JdbcClient jdbcClient;

    SyncLogPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID create(UUID userId, String provider, String eventType,
                       String sourceId, String payloadJson) {
        UUID id = UUID.randomUUID();
        jdbcClient.sql("""
                INSERT INTO sync_logs
                    (id, user_id, provider, event_type, status, source_id, payload, created_at)
                VALUES
                    (:id, :userId, :provider, :eventType, 'pending', :sourceId,
                     :payload::jsonb, now())
                """)
                .param("id",         id)
                .param("userId",     userId)
                .param("provider",   provider)
                .param("eventType",  eventType)
                .param("sourceId",   sourceId)
                .param("payload",    payloadJson)
                .update();
        return id;
    }

    @Override
    @Transactional
    public void complete(UUID logId, String status, UUID activityId, String errorMessage) {
        jdbcClient.sql("""
                UPDATE sync_logs
                   SET status        = :status,
                       activity_id   = :activityId,
                       error_message = :errorMessage,
                       processed_at  = now()
                 WHERE id = :id
                """)
                .param("id",           logId)
                .param("status",       status)
                .param("activityId",   activityId)
                .param("errorMessage", errorMessage)
                .update();
    }
}
