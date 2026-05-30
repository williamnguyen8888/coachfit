package com.coachfit.auth.application.service;

import com.coachfit.auth.application.port.in.*;
import com.coachfit.auth.application.port.out.RefreshTokenPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.exception.EmailAlreadyExistsException;
import com.coachfit.auth.domain.exception.InvalidCredentialsException;
import com.coachfit.auth.domain.exception.TokenExpiredException;
import com.coachfit.auth.domain.model.AuthUser;
import com.coachfit.auth.domain.model.RefreshToken;
import com.coachfit.shared.adapter.in.security.jwt.JwtTokenProvider;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Core auth service — implements email/password register, login, refresh, and logout.
 *
 * <p>Depends on shared infrastructure ({@link JwtTokenProvider}, {@link PasswordEncoder})
 * and auth-module output ports only. No web-layer coupling.
 */
@Service
public class AuthService
        implements RegisterUseCase, LoginUseCase, RefreshTokenUseCase, LogoutUseCase {

    private final UserPersistencePort         userPort;
    private final RefreshTokenPersistencePort tokenPort;
    private final PasswordEncoder             passwordEncoder;
    private final JwtTokenProvider            jwtTokenProvider;
    private final Duration                    refreshExpiry;

    public AuthService(UserPersistencePort userPort,
                       RefreshTokenPersistencePort tokenPort,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       @Value("${app.security.refresh-expiration-ms}") long refreshExpirationMs) {
        this.userPort         = userPort;
        this.tokenPort        = tokenPort;
        this.passwordEncoder  = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshExpiry    = Duration.ofMillis(refreshExpirationMs);
    }

    // ── RegisterUseCase ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public RegisterUseCase.AuthResult register(RegisterCommand command) {
        if (userPort.existsByEmail(command.email())) {
            throw new EmailAlreadyExistsException(command.email());
        }

        String hash = passwordEncoder.encode(command.password());
        AuthUser user = userPort.createUser(command.email(), command.fullName(), hash);

        return new RegisterUseCase.AuthResult(
                generateJwt(user), user, createRefreshToken(user.id()));
    }

    // ── LoginUseCase ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public LoginUseCase.AuthResult login(LoginCommand command) {
        AuthUser user = userPort.findByEmail(command.email())
                .orElseThrow(InvalidCredentialsException::new);

        String storedHash = userPort.findPasswordHashByEmail(command.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(command.password(), storedHash)) {
            throw new InvalidCredentialsException();
        }

        return new LoginUseCase.AuthResult(
                generateJwt(user), user, createRefreshToken(user.id()));
    }

    // ── RefreshTokenUseCase ───────────────────────────────────────────────────

    @Override
    @Transactional
    public RefreshResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new TokenExpiredException();
        }
        String hash = hashToken(rawRefreshToken);

        RefreshToken token = tokenPort.findByTokenHash(hash)
                .orElseThrow(TokenExpiredException::new);

        if (!token.isValid()) {
            throw new TokenExpiredException();
        }

        AuthUser user = userPort.findById(token.userId())
                .orElseThrow(TokenExpiredException::new);

        // Rotate: revoke the old token, issue a new one.
        tokenPort.revokeByTokenHash(hash);
        String newRaw = createRefreshToken(user.id());

        return new RefreshResult(generateJwt(user), user, newRaw);
    }

    // ── LogoutUseCase ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        tokenPort.revokeByTokenHash(hashToken(rawRefreshToken));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Generates an opaque refresh token, stores its SHA-256 hash, returns the raw value.
     * The raw value is sent once in an httpOnly cookie — never stored in plaintext.
     */
    String createRefreshToken(UUID userId) {
        String raw  = UUID.randomUUID().toString();
        tokenPort.create(userId, hashToken(raw), Instant.now().plus(refreshExpiry));
        return raw;
    }

    String generateJwt(AuthUser user) {
        UserPrincipal principal = new UserPrincipal(
                user.id(), user.email(), user.role(), user.tier());
        return jwtTokenProvider.generateToken(principal);
    }

    static String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
