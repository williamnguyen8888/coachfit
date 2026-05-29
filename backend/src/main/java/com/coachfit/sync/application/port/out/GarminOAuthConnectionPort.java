package com.coachfit.sync.application.port.out;

import java.util.Optional;
import java.util.UUID;

/**
 * Output port: Garmin OAuth connection operations needed by the sync module.
 *
 * <p>This is a narrow read-only view of {@code oauth_connections} limited to what
 * the Garmin push processing pipeline needs. It deliberately avoids importing the
 * auth module's full persistence port to prevent cross-module coupling.
 *
 * <p>The Garmin-specific {@code userAccessToken} is stored as
 * {@code oauth_connections.provider_user_id} when the user completes the OAuth 1.0a
 * flow (docs/06-sync-engine-spec.md §Garmin OAuth 1.0a Flow).
 */
public interface GarminOAuthConnectionPort {

    /**
     * Resolves the CoachFit {@code user_id} from a Garmin {@code userAccessToken}.
     *
     * <p>Garmin embeds the token in every push payload element. The token maps to
     * {@code oauth_connections.provider_user_id} where {@code provider = 'garmin'}.
     *
     * @param userAccessToken Garmin-issued access token (plain text — not encrypted)
     * @return CoachFit user UUID, or empty if no connection exists
     */
    Optional<UUID> findUserIdByAccessToken(String userAccessToken);

    /**
     * Marks a Garmin OAuth connection as deregistered.
     *
     * <p>Called when Garmin sends a deregistration callback — the user unlinked
     * CoachFit from Garmin Connect. Sets {@code sync_status = 'disconnected'}
     * and {@code push_enabled = false}. Data already synced is kept per
     * docs/11-privacy-compliance.md §Data Retention.
     *
     * @param userAccessToken the revoked Garmin access token
     */
    void markDeregistered(String userAccessToken);
}
