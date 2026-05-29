package com.coachfit.shared.adapter.in.security.jwt;

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
import java.util.UUID;

/**
 * First filter in the CoachFit security chain (after CORS).
 *
 * <p>Extracts a JWT from the {@code Authorization: Bearer <token>} header,
 * validates it via {@link JwtTokenProvider}, and, on success, places a
 * {@link UserPrincipal}-backed {@link UsernamePasswordAuthenticationToken}
 * in the {@link SecurityContextHolder}.
 *
 * <p>API-key tokens ({@code cf_live_*}) are intentionally skipped here and
 * handled by {@link com.coachfit.shared.adapter.in.security.apikey.ApiKeyAuthenticationFilter}.
 *
 * <p>On failure the filter simply clears the context and continues the chain —
 * the {@link org.springframework.security.web.AuthenticationEntryPoint} will
 * produce the 401 response for any subsequently protected endpoint.
 *
 * <h3>Filter chain order (docs/08-auth-model.md)</h3>
 * <pre>
 * CorsFilter → JwtAuthenticationFilter → ApiKeyAuthenticationFilter
 *   → FeatureGateFilter → RateLimitFilter → Controller
 * </pre>
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX   = "Bearer ";
    private static final String API_KEY_PREFIX  = "cf_live_";
    private static final String AUTH_HEADER     = "Authorization";

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractBearerToken(request);

        if (token != null && !token.startsWith(API_KEY_PREFIX)) {
            if (jwtTokenProvider.validateToken(token)) {
                try {
                    UUID   userId = jwtTokenProvider.extractUserId(token);
                    String email  = jwtTokenProvider.extractEmail(token);
                    String role   = jwtTokenProvider.extractRole(token);
                    String tier   = jwtTokenProvider.extractTier(token);

                    UserPrincipal principal = new UserPrincipal(userId, email, role, tier);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    principal, null, principal.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(auth);

                } catch (Exception ex) {
                    // Malformed claims — clear context and let entry point handle 401.
                    log.debug("Failed to build principal from JWT claims: {}", ex.getMessage());
                    SecurityContextHolder.clearContext();
                }
            } else {
                // Invalid / expired token — clear any stale context.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader(AUTH_HEADER);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
