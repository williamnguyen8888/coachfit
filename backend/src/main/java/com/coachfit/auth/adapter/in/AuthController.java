package com.coachfit.auth.adapter.in;

import com.coachfit.auth.adapter.in.dto.AuthResponse;
import com.coachfit.auth.adapter.in.dto.LoginRequest;
import com.coachfit.auth.adapter.in.dto.RegisterRequest;
import com.coachfit.auth.adapter.in.dto.UserDto;
import com.coachfit.auth.application.port.in.*;
import com.coachfit.auth.domain.model.AuthUser;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/**
 * REST controller for the CoachFit auth endpoints.
 *
 * <pre>
 * POST /api/v1/auth/register  → 201 AuthResponse  + Set-Cookie: refresh_token
 * POST /api/v1/auth/login     → 200 AuthResponse  + Set-Cookie: refresh_token
 * POST /api/v1/auth/refresh   → 200 AuthResponse  + Set-Cookie: refresh_token (rotated)
 * POST /api/v1/auth/logout    → 204               + Set-Cookie: refresh_token (cleared)
 * </pre>
 *
 * <p>All endpoints are public (no auth required) — configured in {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final RegisterUseCase    registerUseCase;
    private final LoginUseCase       loginUseCase;
    private final RefreshTokenUseCase refreshTokenUseCase;
    private final LogoutUseCase      logoutUseCase;
    private final boolean            cookieSecure;

    public AuthController(RegisterUseCase registerUseCase,
                          LoginUseCase loginUseCase,
                          RefreshTokenUseCase refreshTokenUseCase,
                          LogoutUseCase logoutUseCase,
                          @Value("${app.security.refresh-cookie-secure:true}") boolean cookieSecure) {
        this.registerUseCase     = registerUseCase;
        this.loginUseCase        = loginUseCase;
        this.refreshTokenUseCase = refreshTokenUseCase;
        this.logoutUseCase       = logoutUseCase;
        this.cookieSecure        = cookieSecure;
    }

    // ── POST /auth/register ───────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        RegisterUseCase.AuthResult result = registerUseCase.register(
                new RegisterUseCase.RegisterCommand(req.email(), req.password(), req.fullName()));

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.rawRefreshToken()).toString())
                .body(new AuthResponse(result.accessToken(), toUserDto(result.user())));
    }

    // ── POST /auth/login ──────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        LoginUseCase.AuthResult result = loginUseCase.login(
                new LoginUseCase.LoginCommand(req.email(), req.password()));

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.rawRefreshToken()).toString())
                .body(new AuthResponse(result.accessToken(), toUserDto(result.user())));
    }

    // ── POST /auth/refresh ────────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = COOKIE_NAME, required = false) String rawRefreshToken) {

        RefreshTokenUseCase.RefreshResult result = refreshTokenUseCase.refresh(rawRefreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.newRawRefreshToken()).toString())
                .body(new AuthResponse(result.accessToken(), toUserDto(result.user())));
    }

    // ── POST /auth/logout ─────────────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = COOKIE_NAME, required = false) String rawRefreshToken) {

        logoutUseCase.logout(rawRefreshToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie().toString())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseCookie refreshCookie(String rawToken) {
        return ResponseCookie.from(COOKIE_NAME, rawToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path(COOKIE_PATH)
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .build();
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path(COOKIE_PATH)
                .maxAge(Duration.ZERO)
                .sameSite("Strict")
                .build();
    }

    private UserDto toUserDto(AuthUser user) {
        return new UserDto(user.id(), user.email(), user.fullName(), user.role(), user.tier());
    }
}
