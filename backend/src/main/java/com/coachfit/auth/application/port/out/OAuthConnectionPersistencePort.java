package com.coachfit.auth.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: OAuth connection persistence for Google login linking.
 *
 * <p>Tokens are stored AES-256-GCM encrypted per docs/08-auth-model.md §Security Checklist.
 */
public interface OAuthConnectionPersistencePort {

    /**
     * Upserts the OAuth connection record.
     * On conflict (user_id, provider) → updates access/refresh tokens.
     */
    void upsert(UUID userId,
                String provider,
                String providerUserId,
                String encryptedAccessToken,
                String encryptedRefreshToken,  // null if not returned
                Instant tokenExpiresAt,         // null for OAuth 1.0a
                String[] scopes);

    /**
     * Upserts an OAuth connection that also carries a token secret (OAuth 1.0a, e.g. Garmin).
     *
     * <p>The {@code encryptedTokenSecret} is stored in the {@code access_token_secret} column.
     * For OAuth 1.0a, {@code encryptedRefreshToken} and {@code tokenExpiresAt} are {@code null}
     * because Garmin tokens never expire and there is no refresh flow.
     */
    void upsertWithSecret(UUID userId,
                          String provider,
                          String providerUserId,
                          String encryptedAccessToken,
                          String encryptedRefreshToken, // null for OAuth 1.0a
                          String encryptedTokenSecret,  // OAuth 1.0a token secret
                          Instant tokenExpiresAt,        // null for OAuth 1.0a
                          String[] scopes);

    /**
     * Loads the raw (encrypted) access_token_secret for a user + provider pair.
     * Required for signing OAuth 1.0a requests (e.g. Garmin Health API calls).
     *
     * @return the encrypted token secret, or empty if not present / not applicable
     */
    Optional<String> findTokenSecretByUserAndProvider(UUID userId, String provider);

    /**
     * Looks up the CoachFit user ID for a given OAuth provider identity.
     * Used on callback to detect returning users without loading the full user.
     */
    Optional<UUID> findUserIdByProviderAndProviderId(String provider, String providerUserId);

    /**
     * Loads the raw (encrypted) OAuth tokens for a user + provider pair.
     * Used by the sync worker to obtain Strava access/refresh tokens.
     *
     * @return tokens if the connection exists, empty if the user has not connected this provider
     */
    Optional<OAuthTokens> findTokensByUserAndProvider(UUID userId, String provider);

    // ── Account deletion support ──────────────────────────────────────────────

    /**
     * Soft-revokes ALL OAuth connections for a user — sets {@code sync_status = 'revoked'}.
     *
     * <p>Used by {@code DELETE /account}: the actual provider-side token revocation
     * (Strava API call, Garmin deregistration) is handled asynchronously by the worker.
     * This is the minimum required step to stop further syncs immediately.
     */
    void softRevokeAllForUser(UUID userId);

    // ── Data carrier ─────────────────────────────────────────────────────────

    /**
     * Encrypted token data as stored in {@code oauth_connections}.
     * Decrypt with {@code AesTokenEncryptionUtil} before use.
     */
    record OAuthTokens(
            String  encryptedAccessToken,
            String  encryptedRefreshToken,
            Instant tokenExpiresAt
    ) {}
}
