package com.coachfit.shared.adapter.in.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Stateless JWT utility component.
 *
 * <h3>Token structure (from docs/08-auth-model.md)</h3>
 * <pre>
 * {
 *   "sub":   "user-uuid",
 *   "email": "...",
 *   "role":  "athlete",
 *   "tier":  "free",
 *   "iat":   &lt;epoch&gt;,
 *   "exp":   &lt;epoch&gt;
 * }
 * </pre>
 *
 * <p>Signing algorithm: HS256 (HMAC-SHA-256), key derived from {@code app.security.jwt-secret}.
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE  = "role";
    private static final String CLAIM_TIER  = "tier";

    private final SecretKey signingKey;
    private final long jwtExpirationMs;

    public JwtTokenProvider(JwtProperties props) {
        // Derive a HS256-safe key from the configured secret string.
        // In production JWT_SECRET must be a high-entropy value (≥ 32 chars).
        this.signingKey       = Keys.hmacShaKeyFor(
                props.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.jwtExpirationMs  = props.jwtExpirationMs();
    }

    // ── Token generation ──────────────────────────────────────────────────────

    /**
     * Generates a signed access JWT for the given principal.
     *
     * @param principal authenticated user
     * @return compact signed JWT string
     */
    public String generateToken(UserPrincipal principal) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(principal.getUserId().toString())
                .claim(CLAIM_EMAIL, principal.getEmail())
                .claim(CLAIM_ROLE,  principal.getRole())
                .claim(CLAIM_TIER,  principal.getTier())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    // ── Token validation ──────────────────────────────────────────────────────

    /**
     * Validates the token signature and expiry.
     *
     * @param token raw JWT string (without "Bearer " prefix)
     * @return {@code true} if the token is well-formed, correctly signed, and not expired
     */
    public boolean validateToken(String token) {
        try {
            parserBuilder().parseSignedClaims(token);
            return true;
        } catch (JwtException ex) {
            // Log at debug — callers log at higher level if needed.
            log.debug("JWT validation failed: {}", ex.getMessage());
            return false;
        } catch (IllegalArgumentException ex) {
            log.debug("JWT token is null or empty: {}", ex.getMessage());
            return false;
        }
    }

    // ── Claims extraction ─────────────────────────────────────────────────────

    /**
     * Parses and returns the full {@link Claims} payload.
     * Caller must call {@link #validateToken} first.
     */
    public Claims getClaimsFromToken(String token) {
        return parserBuilder()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Extracts the subject (user UUID). */
    public UUID extractUserId(String token) {
        return UUID.fromString(getClaimsFromToken(token).getSubject());
    }

    /** Extracts the {@code role} custom claim. */
    public String extractRole(String token) {
        return getClaimsFromToken(token).get(CLAIM_ROLE, String.class);
    }

    /** Extracts the {@code tier} custom claim. */
    public String extractTier(String token) {
        return getClaimsFromToken(token).get(CLAIM_TIER, String.class);
    }

    /** Extracts the {@code email} custom claim. */
    public String extractEmail(String token) {
        return getClaimsFromToken(token).get(CLAIM_EMAIL, String.class);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private io.jsonwebtoken.JwtParser parserBuilder() {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build();
    }
}
