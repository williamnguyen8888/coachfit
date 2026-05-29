package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;

/**
 * Use case: complete the Google OAuth2 callback — find/create user, return JWT.
 *
 * <p>Docs/08-auth-model.md §Google OAuth:
 * <ul>
 *   <li>If email doesn't exist → auto-register (no password set)</li>
 *   <li>If email exists → link Google connection to existing account</li>
 * </ul>
 */
public interface GoogleOAuthUseCase {

    /**
     * @param code the authorization code received from Google's callback
     * @return access token, user info, and raw refresh token
     */
    AuthResult handleCallback(String code);

    record AuthResult(String accessToken, AuthUser user, String rawRefreshToken) {}
}
