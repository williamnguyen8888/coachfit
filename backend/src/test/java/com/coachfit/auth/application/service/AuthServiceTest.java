package com.coachfit.auth.application.service;

import com.coachfit.auth.application.port.in.LoginUseCase;
import com.coachfit.auth.application.port.in.RefreshTokenUseCase;
import com.coachfit.auth.application.port.in.RegisterUseCase;
import com.coachfit.auth.application.port.out.RefreshTokenPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.exception.EmailAlreadyExistsException;
import com.coachfit.auth.domain.exception.InvalidCredentialsException;
import com.coachfit.auth.domain.exception.TokenExpiredException;
import com.coachfit.auth.domain.model.AuthUser;
import com.coachfit.auth.domain.model.RefreshToken;
import com.coachfit.shared.adapter.in.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 *
 * <p>All dependencies are mocked — no Spring context is loaded.
 * Tests cover the main flows: register, login, refresh (rotation), and logout.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserPersistencePort         userPort;
    @Mock RefreshTokenPersistencePort tokenPort;
    @Mock PasswordEncoder             passwordEncoder;
    @Mock JwtTokenProvider            jwtTokenProvider;

    AuthService authService;

    // Inject the refresh expiry via ReflectionTestUtils (mirrors @Value injection)
    private static final long REFRESH_MS = 2_592_000_000L;  // 30 days

    private static final UUID   USER_ID  = UUID.randomUUID();
    private static final String EMAIL    = "athlete@coachfit.io";
    private static final String NAME     = "Test Athlete";
    private static final String PASSWORD = "securePass1";
    private static final String HASH     = "$2a$12$hashedPasswordValue";
    private static final String JWT      = "eyJ.header.payload.sig";

    private AuthUser freeUser() {
        return new AuthUser(USER_ID, EMAIL, NAME, "athlete", "free");
    }

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthService(
                userPort, tokenPort, passwordEncoder, jwtTokenProvider, REFRESH_MS);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    @Test
    void register_success_returnsJwtAndRefreshToken() {
        when(userPort.existsByEmail(EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(PASSWORD)).thenReturn(HASH);
        when(userPort.createUser(EMAIL, NAME, HASH)).thenReturn(freeUser());
        when(jwtTokenProvider.generateToken(any())).thenReturn(JWT);
        doNothing().when(tokenPort).create(any(), any(), any());

        RegisterUseCase.AuthResult result = authService.register(
                new RegisterUseCase.RegisterCommand(EMAIL, PASSWORD, NAME));

        assertThat(result.accessToken()).isEqualTo(JWT);
        assertThat(result.user().email()).isEqualTo(EMAIL);
        assertThat(result.user().tier()).isEqualTo("free");
        assertThat(result.rawRefreshToken()).isNotBlank();

        verify(userPort).createUser(EMAIL, NAME, HASH);
        verify(tokenPort).create(eq(USER_ID), anyString(), any(Instant.class));
    }

    @Test
    void register_emailAlreadyExists_throwsEmailAlreadyExistsException() {
        when(userPort.existsByEmail(EMAIL)).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterUseCase.RegisterCommand(EMAIL, PASSWORD, NAME)))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(userPort, never()).createUser(any(), any(), any());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Test
    void login_success_returnsJwtAndRefreshToken() {
        when(userPort.findByEmail(EMAIL)).thenReturn(Optional.of(freeUser()));
        when(userPort.findPasswordHashByEmail(EMAIL)).thenReturn(Optional.of(HASH));
        when(passwordEncoder.matches(PASSWORD, HASH)).thenReturn(true);
        when(jwtTokenProvider.generateToken(any())).thenReturn(JWT);
        doNothing().when(tokenPort).create(any(), any(), any());

        LoginUseCase.AuthResult result = authService.login(
                new LoginUseCase.LoginCommand(EMAIL, PASSWORD));

        assertThat(result.accessToken()).isEqualTo(JWT);
        assertThat(result.rawRefreshToken()).isNotBlank();
    }

    @Test
    void login_userNotFound_throwsInvalidCredentials() {
        when(userPort.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginUseCase.LoginCommand(EMAIL, PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        when(userPort.findByEmail(EMAIL)).thenReturn(Optional.of(freeUser()));
        when(userPort.findPasswordHashByEmail(EMAIL)).thenReturn(Optional.of(HASH));
        when(passwordEncoder.matches(PASSWORD, HASH)).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginUseCase.LoginCommand(EMAIL, PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    @Test
    void refresh_validToken_returnsNewJwtAndRotatesRefreshToken() {
        String rawToken = UUID.randomUUID().toString();
        String tokenHash = AuthService.hashToken(rawToken);
        RefreshToken validToken = new RefreshToken(
                UUID.randomUUID(), USER_ID, tokenHash, Instant.now().plusSeconds(3600), null);

        when(tokenPort.findByTokenHash(tokenHash)).thenReturn(Optional.of(validToken));
        when(userPort.findById(USER_ID)).thenReturn(Optional.of(freeUser()));
        when(jwtTokenProvider.generateToken(any())).thenReturn(JWT);
        doNothing().when(tokenPort).revokeByTokenHash(anyString());
        doNothing().when(tokenPort).create(any(), any(), any());

        RefreshTokenUseCase.RefreshResult result = authService.refresh(rawToken);

        assertThat(result.accessToken()).isEqualTo(JWT);
        assertThat(result.newRawRefreshToken()).isNotBlank();
        assertThat(result.newRawRefreshToken()).isNotEqualTo(rawToken);  // rotated

        verify(tokenPort).revokeByTokenHash(tokenHash);  // old token revoked
        verify(tokenPort).create(eq(USER_ID), anyString(), any());     // new token issued
    }

    @Test
    void refresh_expiredToken_throwsTokenExpiredException() {
        String rawToken = UUID.randomUUID().toString();
        String tokenHash = AuthService.hashToken(rawToken);
        // Token expired 1 second ago
        RefreshToken expired = new RefreshToken(
                UUID.randomUUID(), USER_ID, tokenHash, Instant.now().minusSeconds(1), null);

        when(tokenPort.findByTokenHash(tokenHash)).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh(rawToken))
                .isInstanceOf(TokenExpiredException.class);
    }

    @Test
    void refresh_tokenNotFound_throwsTokenExpiredException() {
        String rawToken = UUID.randomUUID().toString();
        when(tokenPort.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(rawToken))
                .isInstanceOf(TokenExpiredException.class);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Test
    void logout_revokesRefreshToken() {
        String rawToken = UUID.randomUUID().toString();
        doNothing().when(tokenPort).revokeByTokenHash(anyString());

        authService.logout(rawToken);

        verify(tokenPort).revokeByTokenHash(AuthService.hashToken(rawToken));
    }

    @Test
    void logout_nullToken_silentlyIgnored() {
        authService.logout(null);
        verifyNoInteractions(tokenPort);
    }
}
