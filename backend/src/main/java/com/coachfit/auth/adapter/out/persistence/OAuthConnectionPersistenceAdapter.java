package com.coachfit.auth.adapter.out.persistence;

import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient-based adapter for {@code oauth_connections} table.
 *
 * <p>Uses native SQL with {@code ON CONFLICT DO UPDATE} to handle both first-time
 * connect and token refresh (e.g. user reconnects same Google account).
 *
 * <p>JdbcClient is used instead of JPA to avoid the PostgreSQL {@code TEXT[]} scopes
 * column complexity and to keep the UPSERT atomic.
 */
@Repository
class OAuthConnectionPersistenceAdapter implements OAuthConnectionPersistencePort {

    private final JdbcClient jdbcClient;

    OAuthConnectionPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId,
                       String provider,
                       String providerUserId,
                       String encryptedAccessToken,
                       String encryptedRefreshToken,
                       Instant tokenExpiresAt,
                       String[] scopes) {

        // Build a PostgreSQL ARRAY literal: ARRAY['openid','email','profile']
        String scopeArray = buildPgArray(scopes);

        jdbcClient.sql("""
                INSERT INTO oauth_connections
                    (id, user_id, provider, provider_user_id,
                     access_token, refresh_token, token_expires_at, scopes,
                     sync_status, push_enabled, created_at, updated_at)
                VALUES
                    (gen_random_uuid(), :userId, :provider, :providerUserId,
                     :accessToken, :refreshToken, :expiresAt, """ + scopeArray + """
                ::text[],
                     'active', false, now(), now())
                ON CONFLICT (user_id, provider) DO UPDATE SET
                    access_token      = EXCLUDED.access_token,
                    refresh_token     = EXCLUDED.refresh_token,
                    token_expires_at  = EXCLUDED.token_expires_at,
                    updated_at        = now()
                """)
                .param("userId",         userId)
                .param("provider",       provider)
                .param("providerUserId", providerUserId)
                .param("accessToken",    encryptedAccessToken)
                .param("refreshToken",   encryptedRefreshToken)
                .param("expiresAt",      tokenExpiresAt)
                .update();
    }

    @Override
    @Transactional
    public void upsertWithSecret(UUID userId,
                                 String provider,
                                 String providerUserId,
                                 String encryptedAccessToken,
                                 String encryptedRefreshToken,
                                 String encryptedTokenSecret,
                                 Instant tokenExpiresAt,
                                 String[] scopes) {

        String scopeArray = buildPgArray(scopes);

        jdbcClient.sql("""
                INSERT INTO oauth_connections
                    (id, user_id, provider, provider_user_id,
                     access_token, refresh_token, access_token_secret, token_expires_at, scopes,
                     sync_status, push_enabled, created_at, updated_at)
                VALUES
                    (gen_random_uuid(), :userId, :provider, :providerUserId,
                     :accessToken, :refreshToken, :tokenSecret, :expiresAt, """ + scopeArray + """
                ::text[],
                     'active', true, now(), now())
                ON CONFLICT (user_id, provider) DO UPDATE SET
                    access_token        = EXCLUDED.access_token,
                    refresh_token       = EXCLUDED.refresh_token,
                    access_token_secret = EXCLUDED.access_token_secret,
                    token_expires_at    = EXCLUDED.token_expires_at,
                    push_enabled        = true,
                    updated_at          = now()
                """)
                .param("userId",         userId)
                .param("provider",       provider)
                .param("providerUserId", providerUserId)
                .param("accessToken",    encryptedAccessToken)
                .param("refreshToken",   encryptedRefreshToken)
                .param("tokenSecret",    encryptedTokenSecret)
                .param("expiresAt",      tokenExpiresAt)
                .update();
    }

    @Override
    public Optional<UUID> findUserIdByProviderAndProviderId(String provider, String providerUserId) {
        return jdbcClient.sql("""
                SELECT user_id FROM oauth_connections
                WHERE provider = :provider AND provider_user_id = :providerUserId
                """)
                .param("provider",       provider)
                .param("providerUserId", providerUserId)
                .query(UUID.class)
                .optional();
    }

    @Override
    public Optional<OAuthConnectionPersistencePort.OAuthTokens> findTokensByUserAndProvider(
            UUID userId, String provider) {
        return jdbcClient.sql("""
                SELECT access_token, refresh_token, token_expires_at
                  FROM oauth_connections
                 WHERE user_id  = :userId
                   AND provider = :provider
                """)
                .param("userId",   userId)
                .param("provider", provider)
                .query((rs, rowNum) -> new OAuthConnectionPersistencePort.OAuthTokens(
                        rs.getString("access_token"),
                        rs.getString("refresh_token"),
                        rs.getTimestamp("token_expires_at") != null
                                ? rs.getTimestamp("token_expires_at").toInstant()
                                : null))
                .optional();
    }

    @Override
    public Optional<String> findTokenSecretByUserAndProvider(UUID userId, String provider) {
        return jdbcClient.sql("""
                SELECT access_token_secret
                  FROM oauth_connections
                 WHERE user_id  = :userId
                   AND provider = :provider
                """)
                .param("userId",   userId)
                .param("provider", provider)
                .query(String.class)
                .optional();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildPgArray(String[] values) {
        if (values == null || values.length == 0) return "ARRAY[]";
        StringBuilder sb = new StringBuilder("ARRAY['");
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append("','");
            sb.append(values[i].replace("'", "''"));   // escape single quotes
        }
        sb.append("']");
        return sb.toString();
    }
}
