package com.coachfit.sync.adapter.out.persistence;

import com.coachfit.sync.application.port.out.StravaTokenPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link StravaTokenPort}.
 *
 * <p>Reads directly from {@code oauth_connections} where {@code provider = 'strava'}.
 * This is intentionally kept as a separate adapter from the auth module's
 * {@code OAuthConnectionPersistenceAdapter} to avoid cross-module coupling —
 * the sync module only needs token loading, not the full OAuth upsert capability.
 */
@Repository
class StravaOAuthConnectionAdapter implements StravaTokenPort {

    private final JdbcClient jdbcClient;

    StravaOAuthConnectionAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Optional<StravaTokens> loadTokens(UUID userId) {
        return jdbcClient.sql("""
                SELECT access_token, refresh_token, token_expires_at
                  FROM oauth_connections
                 WHERE user_id  = :userId
                   AND provider = 'strava'
                """)
                .param("userId", userId)
                .query((rs, rowNum) -> new StravaTokens(
                        rs.getString("access_token"),
                        rs.getString("refresh_token"),
                        rs.getTimestamp("token_expires_at") != null
                                ? rs.getTimestamp("token_expires_at").toInstant()
                                : null))
                .optional();
    }

    @Override
    public Optional<UUID> findUserByStravaAthleteId(String stravaAthleteId) {
        return jdbcClient.sql("""
                SELECT user_id
                  FROM oauth_connections
                 WHERE provider          = 'strava'
                   AND provider_user_id  = :athleteId
                """)
                .param("athleteId", stravaAthleteId)
                .query(UUID.class)
                .optional();
    }
}
