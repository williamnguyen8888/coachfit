package com.coachfit.auth.application.port.in;

import com.coachfit.auth.domain.model.AuthUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Use case: authenticate with email and password.
 *
 * <p>Docs/05-api-design.md: {@code POST /auth/login} → 200
 */
public interface LoginUseCase {

    AuthResult login(LoginCommand command);

    record LoginCommand(
            @NotBlank @Email String email,
            @NotBlank        String password
    ) {}

    record AuthResult(String accessToken, AuthUser user, String rawRefreshToken) {}
}
