package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;

/**
 * Use case: Garmin OAuth 1.0a three-legged flow.
 *
 * <p>Flow (docs/08-auth-model.md §Garmin OAuth (Phase 1), docs/06-sync-engine-spec.md §OAuth 1.0a Flow):
 * <ol>
 *   <li>Request a temporary token from Garmin — {@link #initiateOAuth()}</li>
 *   <li>Browser redirected to Garmin authorization page</li>
 *   <li>User authorizes → Garmin redirects to callback with oauth_token + oauth_verifier</li>
 *   <li>Exchange temporary token + verifier for permanent access_token + access_token_secret — {@link #handleCallback}</li>
 *   <li>Store encrypted tokens in {@code oauth_connections} (token secret replaces refresh_token column)</li>
 *   <li>Issue CoachFit JWT + refresh token</li>
 * </ol>
 *
 * <p>Unlike OAuth 2.0, Garmin access tokens do NOT expire — no refresh flow needed.
 * The {@code access_token_secret} is essential for every signed API call.
 */
public interface GarminOAuthUseCase {

    /**
     * Step 1 of OAuth 1.0a: obtains a request token from Garmin and returns the
     * data needed for the controller to redirect the user and persist the token secret.
     *
     * @return the request token + secret that the controller must store in Redis
     *         (keyed by oauth_token, 10-minute TTL) before redirecting the user.
     */
    RequestTokenResult initiateOAuth();

    /**
     * Step 3 of OAuth 1.0a: exchanges the temporary credentials for permanent ones,
     * resolves/creates the CoachFit user, stores encrypted tokens, issues a JWT.
     *
     * @param oauthToken    the oauth_token echoed back by Garmin in the callback
     * @param oauthVerifier the oauth_verifier issued by Garmin after user authorization
     * @param requestSecret the request_token_secret retrieved from Redis for this oauth_token
     * @return access token, user info, and raw refresh token for the CoachFit session
     */
    AuthResult handleCallback(String oauthToken, String oauthVerifier, String requestSecret);

    // ── Data carriers ─────────────────────────────────────────────────────────

    /**
     * Temporary credentials returned by {@link #initiateOAuth()}.
     *
     * @param oauthToken        the oauth_token parameter (used as redirect + Redis key)
     * @param oauthTokenSecret  the oauth_token_secret (stored in Redis, needed for access token exchange)
     * @param authorizationUrl  the full Garmin authorization URL to redirect the user to
     */
    record RequestTokenResult(String oauthToken, String oauthTokenSecret, String authorizationUrl) {}

    /**
     * Final result after successful callback exchange.
     * Mirrors {@link StravaOAuthUseCase.AuthResult} for consistency.
     */
    record AuthResult(String accessToken, AuthUser user, String rawRefreshToken) {}
}
