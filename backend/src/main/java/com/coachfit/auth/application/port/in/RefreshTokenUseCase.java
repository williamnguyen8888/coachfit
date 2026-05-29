package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;

/**
 * Use case: exchange a valid refresh token for a new JWT + rotated refresh token.
 *
 * <p>Docs/05-api-design.md: {@code POST /auth/refresh} → 200
 * Docs/08-auth-model.md: refresh token stored as httpOnly cookie.
 *
 * <p>Each successful refresh rotates the refresh token (old one revoked, new one issued),
 * limiting the window for token theft.
 */
public interface RefreshTokenUseCase {

    /**
     * @param rawRefreshToken the opaque token from the httpOnly cookie
     * @return new access token, user info, and the new raw refresh token
     * @throws com.coachfit.auth.domain.exception.TokenExpiredException if token is invalid or expired
     */
    RefreshResult refresh(String rawRefreshToken);

    record RefreshResult(String accessToken, AuthUser user, String newRawRefreshToken) {}
}
