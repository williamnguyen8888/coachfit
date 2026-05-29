package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;

/**
 * Use case: complete the Strava OAuth2 callback — find/create user, store tokens, return JWT.
 *
 * <p>Docs/08-auth-model.md §Strava OAuth:
 * <ul>
 *   <li>If email doesn't exist → auto-register (no password set)</li>
 *   <li>If email exists → link Strava connection to existing account</li>
 *   <li>Tokens stored AES-256-GCM encrypted in {@code oauth_connections}</li>
 * </ul>
 *
 * <p>Docs/06-sync-engine-spec.md §Strava OAuth Flow — steps 1–5.
 */
public interface StravaOAuthUseCase {

    /**
     * @param code the authorization code received from Strava's callback
     * @return access token, user info, and raw refresh token for the CoachFit session
     */
    AuthResult handleCallback(String code);

    record AuthResult(String accessToken, AuthUser user, String rawRefreshToken) {}
}
