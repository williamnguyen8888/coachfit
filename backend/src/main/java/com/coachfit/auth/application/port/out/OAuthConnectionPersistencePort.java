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
     * Looks up the CoachFit user ID for a given OAuth provider identity.
     * Used on callback to detect returning users without loading the full user.
     */
    Optional<UUID> findUserIdByProviderAndProviderId(String provider, String providerUserId);
}
