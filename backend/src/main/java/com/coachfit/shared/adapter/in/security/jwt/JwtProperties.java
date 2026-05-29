package com.coachfit.shared.adapter.in.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.security.*} properties for JWT signing and expiry.
 *
 * <pre>
 * app:
 *   security:
 *     jwt-secret:            &lt;256-bit base64 or raw secret&gt;
 *     jwt-expiration-ms:     3600000      # 1 hour (access token)
 *     refresh-expiration-ms: 2592000000   # 30 days (refresh token)
 * </pre>
 */
@ConfigurationProperties(prefix = "app.security")
public record JwtProperties(
        String jwtSecret,
        long jwtExpirationMs,
        long refreshExpirationMs
) {}
