package com.coachfit.auth.application.port.in;

/**
 * Use case: revoke a refresh token (logout).
 *
 * <p>Docs/05-api-design.md: {@code POST /auth/logout} → 204
 *
 * <p>Only the specific refresh token is revoked — other sessions remain active.
 * The controller clears the httpOnly cookie on the response side.
 */
public interface LogoutUseCase {

    /**
     * @param rawRefreshToken the opaque token from the httpOnly cookie;
     *                        silently ignored if the token is not found (idempotent)
     */
    void logout(String rawRefreshToken);
}
