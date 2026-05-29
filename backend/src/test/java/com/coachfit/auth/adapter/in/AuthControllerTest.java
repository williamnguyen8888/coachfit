package com.coachfit.auth.adapter.in;

import com.coachfit.auth.adapter.in.dto.AuthResponse;
import com.coachfit.auth.adapter.in.dto.UserDto;
import com.coachfit.auth.application.port.in.*;
import com.coachfit.auth.domain.exception.EmailAlreadyExistsException;
import com.coachfit.auth.domain.exception.InvalidCredentialsException;
import com.coachfit.auth.domain.exception.TokenExpiredException;
import com.coachfit.auth.domain.model.AuthUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web layer slice test for {@link AuthController}.
 *
 * <p>Spring Security auto-configuration is excluded so tests focus on controller logic
 * only — security filter chain tests are handled by {@code SecurityConfig} integration tests.
 *
 * <p>Uses {@code @MockitoBean} (Spring Boot 3.4+) to mock use case dependencies.
 */
@WebMvcTest(
        controllers = AuthController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration.class
        }
)
@Import(AuthExceptionHandler.class)
@TestPropertySource(properties = {
        "app.security.refresh-cookie-secure=false",
        "app.security.jwt-secret=test-secret-at-least-32-chars-long",
        "app.security.refresh-expiration-ms=2592000000"
})
class AuthControllerTest {

    @Autowired MockMvc     mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean RegisterUseCase     registerUseCase;
    @MockitoBean LoginUseCase        loginUseCase;
    @MockitoBean RefreshTokenUseCase refreshTokenUseCase;
    @MockitoBean LogoutUseCase       logoutUseCase;

    private static final UUID   USER_ID = UUID.randomUUID();
    private static final String EMAIL   = "athlete@coachfit.io";
    private static final String NAME    = "Test Athlete";
    private static final String JWT     = "eyJ.test.token";
    private static final String REFRESH = "raw-refresh-uuid";

    private AuthUser freeUser() {
        return new AuthUser(USER_ID, EMAIL, NAME, "athlete", "free");
    }

    private UserDto freeUserDto() {
        return new UserDto(USER_ID, EMAIL, NAME, "athlete", "free");
    }

    // ── POST /auth/register ───────────────────────────────────────────────────

    @Test
    void register_returns201WithTokenAndCookie() throws Exception {
        when(registerUseCase.register(any()))
                .thenReturn(new RegisterUseCase.AuthResult(JWT, freeUser(), REFRESH));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "password": "password123", "fullName": "%s" }
                                """.formatted(EMAIL, NAME)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value(JWT))
                .andExpect(jsonPath("$.user.email").value(EMAIL))
                .andExpect(jsonPath("$.user.tier").value("free"))
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
    }

    @Test
    void register_returns409WhenEmailExists() throws Exception {
        when(registerUseCase.register(any()))
                .thenThrow(new EmailAlreadyExistsException(EMAIL));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "password": "password123", "fullName": "Test" }
                                """.formatted(EMAIL)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void register_returns400WhenPasswordTooShort() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "password": "short", "fullName": "Test" }
                                """.formatted(EMAIL)))
                .andExpect(status().isBadRequest());
    }

    // ── POST /auth/login ──────────────────────────────────────────────────────

    @Test
    void login_returns200WithTokenAndCookie() throws Exception {
        when(loginUseCase.login(any()))
                .thenReturn(new LoginUseCase.AuthResult(JWT, freeUser(), REFRESH));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "password": "password123" }
                                """.formatted(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(JWT))
                .andExpect(jsonPath("$.user.email").value(EMAIL))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("refresh_token=")));
    }

    @Test
    void login_returns401WhenWrongCredentials() throws Exception {
        when(loginUseCase.login(any()))
                .thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "password": "wrongpassword" }
                                """.formatted(EMAIL)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    // ── POST /auth/refresh ────────────────────────────────────────────────────

    @Test
    void refresh_returns200WithNewTokenAndRotatedCookie() throws Exception {
        when(refreshTokenUseCase.refresh(REFRESH))
                .thenReturn(new RefreshTokenUseCase.RefreshResult(JWT, freeUser(), "new-raw-refresh"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", REFRESH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(JWT))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("new-raw-refresh")));
    }

    @Test
    void refresh_returns401WhenTokenExpired() throws Exception {
        when(refreshTokenUseCase.refresh(REFRESH))
                .thenThrow(new TokenExpiredException());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", REFRESH)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
    }

    // ── POST /auth/logout ─────────────────────────────────────────────────────

    @Test
    void logout_returns204AndClearsCookie() throws Exception {
        doNothing().when(logoutUseCase).logout(REFRESH);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", REFRESH)))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
    }
}
