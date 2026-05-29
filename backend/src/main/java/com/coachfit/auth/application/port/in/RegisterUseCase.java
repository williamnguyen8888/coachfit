package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Use case: register a new user with email and password.
 *
 * <p>Docs/05-api-design.md: {@code POST /auth/register} → 201
 */
public interface RegisterUseCase {

    /**
     * @param command validated registration data
     * @return result containing the JWT access token, user info, and raw refresh token
     */
    AuthResult register(RegisterCommand command);

    record RegisterCommand(
            @NotBlank @Email            String email,
            @NotBlank @Size(min = 8)    String password,
            @NotBlank                   String fullName
    ) {}

    /** Internal result — controller extracts token for body, rawRefreshToken for cookie. */
    record AuthResult(String accessToken, AuthUser user, String rawRefreshToken) {}
}
