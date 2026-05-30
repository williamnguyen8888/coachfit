package com.coachfit.shared.adapter.in.security.featuregate;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.IOException;

/**
 * Third filter in the CoachFit security chain.
 *
 * <p>Responsibilities:
 * <ol>
 *   <li><b>Tier-change blacklist</b> — checks Redis key {@code tier_changed:{userId}}.
 *       If present, returns {@code 401 TIER_CHANGED} so the client re-authenticates and
 *       obtains a JWT with the updated tier claim (docs/08-auth-model.md §Tier change handling).</li>
 *   <li><b>Tier gate</b> — reads {@link RequiresTier} annotation on the matched handler
 *       and compares against {@code UserPrincipal.getTier()} via {@link TierHierarchy#satisfies}.
 *       Returns {@code 403 UPGRADE_REQUIRED} if insufficient.</li>
 * </ol>
 *
 * <p>Skips entirely for unauthenticated requests (no principal in context).
 *
 * <p>On {@code HandlerMethod} resolution errors (e.g., no mapping found for the path,
 * dispatcher not yet fully initialised) the filter fails open so infrastructure issues
 * never lock out legitimate users — the downstream 404 / 401 then applies normally.
 */
public class FeatureGateFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FeatureGateFilter.class);

    /** Redis key prefix for tier-change blacklist (docs/08-auth-model.md). */
    private static final String TIER_CHANGED_KEY_PREFIX = "tier_changed:";

    private final StringRedisTemplate            redisTemplate;
    private final ObjectMapper                   objectMapper;
    private final RequestMappingHandlerMapping   handlerMapping;

    public FeatureGateFilter(StringRedisTemplate redisTemplate,
                             ObjectMapper objectMapper,
                             RequestMappingHandlerMapping handlerMapping) {
        this.redisTemplate  = redisTemplate;
        this.objectMapper   = objectMapper;
        this.handlerMapping = handlerMapping;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            // Not authenticated — downstream auth entry point handles 401.
            filterChain.doFilter(request, response);
            return;
        }

        // ── 1. Tier-change blacklist check ────────────────────────────────────
        String blacklistKey = TIER_CHANGED_KEY_PREFIX + principal.getUserId();
        Boolean tierChanged = redisTemplate.hasKey(blacklistKey);
        if (Boolean.TRUE.equals(tierChanged)) {
            log.debug("User {} is in tier-change blacklist — forcing re-authentication", principal.getUserId());
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "TIER_CHANGED",
                    "Your subscription tier has changed. Please re-authenticate.");
            return;
        }

        // ── 2. @RequiresTier annotation check ─────────────────────────────────
        try {
            HandlerExecutionChain chain = handlerMapping.getHandler(request);
            if (chain != null && chain.getHandler() instanceof HandlerMethod hm) {
                RequiresTier annotation = hm.getMethodAnnotation(RequiresTier.class);
                if (annotation != null) {
                    String required = annotation.value();
                    if (!TierHierarchy.satisfies(principal.getTier(), required)) {
                        log.debug("User {} (tier={}) blocked by @RequiresTier(\"{}\")",
                                principal.getUserId(), principal.getTier(), required);
                        writeError(response, HttpServletResponse.SC_FORBIDDEN,
                                "UPGRADE_REQUIRED",
                                "This feature requires tier: " + required);
                        return;
                    }
                }
            }
        } catch (Exception ex) {
            // Fail open — handler resolution errors must not lock users out.
            // The downstream controller / 404 handler will respond appropriately.
            log.warn("FeatureGateFilter: handler resolution failed for {} {} — skipping tier check: {}",
                    request.getMethod(), request.getRequestURI(), ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void writeError(HttpServletResponse response, int status,
                            String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiErrorResponse body = new ApiErrorResponse(new ApiError(code, message));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
