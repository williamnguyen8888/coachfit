package com.coachfit.sync.adapter.out.persistence;

import com.coachfit.sync.application.port.out.GarminOAuthConnectionPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link GarminOAuthConnectionPort}.
 *
 * <p>Reads and updates {@code oauth_connections} rows where {@code provider = 'garmin'}.
 *
 * <p>Note: Garmin's {@code userAccessToken} is stored as {@code provider_user_id}
 * (the plain-text token, not encrypted — Garmin OAuth 1.0a tokens don't expire and
 * are used as user identifiers in push payloads).
 *
 * <p>This is intentionally a separate adapter from the auth module's
 * {@code OAuthConnectionPersistenceAdapter} to avoid cross-module coupling —
 * the sync module only needs the minimal read + status-update capability.
 */
@Repository
class GarminOAuthConnectionAdapter implements GarminOAuthConnectionPort {

    private final JdbcClient jdbcClient;

    GarminOAuthConnectionAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * {@inheritDoc}
     *
     * <p>Garmin's {@code userAccessToken} maps to {@code provider_user_id} in
     * {@code oauth_connections}. Only active (non-disconnected) connections are matched
     * so that deregistered users are naturally excluded.
     */
    @Override
    public Optional<UUID> findUserIdByAccessToken(String userAccessToken) {
        if (userAccessToken == null || userAccessToken.isBlank()) return Optional.empty();
        return jdbcClient.sql("""
                SELECT user_id
                  FROM oauth_connections
                 WHERE provider          = 'garmin'
                   AND provider_user_id  = :token
                   AND sync_status       != 'disconnected'
                """)
                .param("token", userAccessToken)
                .query(UUID.class)
                .optional();
    }

    /**
     * {@inheritDoc}
     *
     * <p>Sets {@code sync_status = 'disconnected'} and {@code push_enabled = false}.
     * The user's health data is kept per the 90-day/account-deletion retention policy
     * (docs/11-privacy-compliance.md §Data Retention Policies).
     */
    @Override
    @Transactional
    public void markDeregistered(String userAccessToken) {
        if (userAccessToken == null || userAccessToken.isBlank()) return;
        jdbcClient.sql("""
                UPDATE oauth_connections
                   SET sync_status  = 'disconnected',
                       push_enabled = false,
                       updated_at   = now()
                 WHERE provider         = 'garmin'
                   AND provider_user_id = :token
                """)
                .param("token", userAccessToken)
                .update();
    }
}
