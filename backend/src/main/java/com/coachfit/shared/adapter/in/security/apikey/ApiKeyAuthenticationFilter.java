package com.coachfit.shared.adapter.in.security.apikey;

import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort;
import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort.ApiKeyRow;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.model.AuthUser;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Fallback authentication filter for CoachFit API keys.
 *
 * <p>Runs <em>after</em> {@link com.coachfit.shared.adapter.in.security.jwt.JwtAuthenticationFilter}.
 * Only activates when:
 * <ol>
 *   <li>The {@code Authorization} header contains {@code Bearer cf_live_*}</li>
 *   <li>No authentication is already present in the {@link SecurityContextHolder}</li>
 * </ol>
 *
 * <h3>API Key format (docs/08-auth-model.md §API Key Authentication)</h3>
 * <pre>
 * Authorization: Bearer cf_live_&lt;32-char hex&gt;
 * Format stored in DB: SHA-256(rawKey) as hex
 * Full key shown only once on creation — never retrievable again.
 * </pre>
 *
 * <h3>Authentication flow</h3>
 * <ol>
 *   <li>Extract raw key from Bearer header (must start with {@code cf_live_})</li>
 *   <li>Hash with SHA-256 via {@link ApiKeyService#sha256Hex}</li>
 *   <li>Look up active, non-expired key in DB via {@link ApiKeyPersistencePort}</li>
 *   <li>Load owning user → build {@link UserPrincipal} → set in context</li>
 *   <li>Update {@code last_used_at} asynchronously</li>
 * </ol>
 */
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyAuthenticationFilter.class);
    private static final String BEARER_PREFIX  = "Bearer ";
    private static final String API_KEY_PREFIX = "cf_live_";
    private static final String AUTH_HEADER    = "Authorization";

    private final ApiKeyPersistencePort apiKeyPersistence;
    private final UserPersistencePort   userPersistence;

    public ApiKeyAuthenticationFilter(ApiKeyPersistencePort apiKeyPersistence,
                                      UserPersistencePort userPersistence) {
        this.apiKeyPersistence = apiKeyPersistence;
        this.userPersistence   = userPersistence;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Only attempt API-key auth when no JWT auth already succeeded.
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String rawKey = extractApiKey(request);
        if (rawKey == null) {
            filterChain.doFilter(request, response);
            return;
        }

        log.debug("API key authentication attempt for request: {} {}",
                request.getMethod(), request.getRequestURI());

        // 1. Hash the raw key
        String hashedKey = Sha256Util.hex(rawKey);

        // 2. Look up active, non-expired key
        Optional<ApiKeyRow> keyOpt = apiKeyPersistence.findActiveByKeyHash(hashedKey);
        if (keyOpt.isEmpty()) {
            log.debug("API key not found or inactive — falling through to 401");
            filterChain.doFilter(request, response);
            return;
        }
        ApiKeyRow apiKey = keyOpt.get();

        // 3. Load the owning user
        Optional<AuthUser> userOpt = userPersistence.findById(apiKey.userId());
        if (userOpt.isEmpty()) {
            log.warn("API key {} points to non-existent user {}", apiKey.id(), apiKey.userId());
            filterChain.doFilter(request, response);
            return;
        }
        AuthUser user = userOpt.get();

        // 4. Build UserPrincipal and set in security context
        UserPrincipal principal = new UserPrincipal(
                user.id(), user.email(), user.role(), user.tier());
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);

        log.debug("API key authentication succeeded for user {}", user.id());

        // 5. Touch last_used_at (best-effort, non-blocking)
        touchLastUsedAsync(apiKey.id());

        filterChain.doFilter(request, response);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractApiKey(HttpServletRequest request) {
        String header = request.getHeader(AUTH_HEADER);
        if (StringUtils.hasText(header)
                && header.startsWith(BEARER_PREFIX)
                && header.substring(BEARER_PREFIX.length()).startsWith(API_KEY_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    /**
     * Updates {@code last_used_at} in a best-effort manner.
     * Runs inline (filter is not async-aware); failure is swallowed to avoid
     * blocking the request or causing auth failures on a non-critical update.
     */
    private void touchLastUsedAsync(java.util.UUID keyId) {
        try {
            apiKeyPersistence.touchLastUsed(keyId);
        } catch (Exception e) {
            log.warn("Failed to update last_used_at for key {}: {}", keyId, e.getMessage());
        }
    }
}
