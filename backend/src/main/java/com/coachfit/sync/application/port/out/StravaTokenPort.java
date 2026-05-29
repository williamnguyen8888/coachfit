package com.coachfit.sync.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: load Strava OAuth tokens for the sync worker.
 *
 * <p>Tokens are stored AES-256-GCM encrypted in {@code oauth_connections}.
 * The sync worker retrieves them here, decrypts with {@code AesTokenEncryptionUtil},
 * and refreshes if expired before calling the Strava API.
 *
 * <p>See docs/06-sync-engine-spec.md §Strava Webhook Processing Step 2 (Worker).
 */
public interface StravaTokenPort {

    /**
     * Loads encrypted Strava tokens for the given CoachFit user.
     *
     * @param userId CoachFit user UUID
     * @return tokens if the user has an active Strava connection, empty otherwise
     */
    Optional<StravaTokens> loadTokens(UUID userId);

    /**
     * Looks up the CoachFit user ID from a Strava athlete ID.
     * Used in the webhook POST handler to identify which user an event belongs to.
     *
     * @param stravaAthleteId numeric Strava athlete ID as string
     * @return the CoachFit user UUID if a matching oauth_connection exists
     */
    Optional<UUID> findUserByStravaAthleteId(String stravaAthleteId);

    // ── Data carrier ─────────────────────────────────────────────────────────

    /**
     * Raw encrypted tokens as stored in {@code oauth_connections}.
     * Decrypt with {@code AesTokenEncryptionUtil} before use.
     */
    record StravaTokens(
            String  encryptedAccessToken,
            String  encryptedRefreshToken,
            Instant tokenExpiresAt          // null if unknown
    ) {}
}
