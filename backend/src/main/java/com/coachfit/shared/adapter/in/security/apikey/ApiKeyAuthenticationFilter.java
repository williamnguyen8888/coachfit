package com.coachfit.shared.adapter.in.security.apikey;

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
 * <h3>API Key format (docs/08-auth-model.md)</h3>
 * <pre>
 * Authorization: Bearer cf_live_&lt;32-char hex&gt;
 * Format stored in DB: SHA-256(rawKey)
 * Full key shown only once on creation.
 * </pre>
 *
 * <h3>TODO — full implementation (auth feature module)</h3>
 * <ol>
 *   <li>Hash the raw key with SHA-256</li>
 *   <li>Look up {@code hashed_key} in {@code api_keys} table via {@code ApiKeyRepository}</li>
 *   <li>Verify {@code is_active = true} and load the owning user</li>
 *   <li>Build {@link UserPrincipal} from the user record and set in context</li>
 *   <li>Rate-limit counter uses the API key's user ID (same as JWT path)</li>
 * </ol>
 */
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyAuthenticationFilter.class);
    private static final String BEARER_PREFIX  = "Bearer ";
    private static final String API_KEY_PREFIX = "cf_live_";
    private static final String AUTH_HEADER    = "Authorization";

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

        log.debug("API key authentication attempt for request: {} {}", request.getMethod(), request.getRequestURI());

        // ── TODO: full API key authentication ──────────────────────────────────
        // String hashedKey = hashSha256(rawKey);
        // ApiKey apiKey = apiKeyRepository.findByHashedKey(hashedKey).orElse(null);
        // if (apiKey == null || !apiKey.isActive()) {
        //     // Let downstream handle 401 via AuthenticationEntryPoint.
        //     filterChain.doFilter(request, response);
        //     return;
        // }
        // User user = userRepository.findById(apiKey.getUserId()).orElseThrow();
        // UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail(),
        //                                             user.getRole(), user.getTier());
        // UsernamePasswordAuthenticationToken auth =
        //         new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        // auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        // SecurityContextHolder.getContext().setAuthentication(auth);
        // ── END TODO ───────────────────────────────────────────────────────────

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
}
