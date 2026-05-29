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
 * <h3>TODO — @RequiresTier enforcement</h3>
 * Full annotation-driven gate requires resolving the matched handler method at filter time.
 * This will be wired once controllers exist, using {@code RequestMappingHandlerMapping}
 * and {@code HandlerMethod} introspection. The blacklist check is fully functional now.
 */
public class FeatureGateFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FeatureGateFilter.class);

    /** Redis key prefix for tier-change blacklist (docs/08-auth-model.md). */
    private static final String TIER_CHANGED_KEY_PREFIX = "tier_changed:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper        objectMapper;

    public FeatureGateFilter(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper  = objectMapper;
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
        // TODO: resolve HandlerMethod from request, read @RequiresTier value,
        //       call TierHierarchy.satisfies(principal.getTier(), requiredTier),
        //       and write 403 UPGRADE_REQUIRED if insufficient.
        //
        // Example (to be enabled once controllers are present):
        //
        // HandlerExecutionChain chain = handlerMapping.getHandler(request);
        // if (chain != null && chain.getHandler() instanceof HandlerMethod hm) {
        //     RequiresTier annotation = hm.getMethodAnnotation(RequiresTier.class);
        //     if (annotation != null) {
        //         String required = annotation.value();
        //         if (!TierHierarchy.satisfies(principal.getTier(), required)) {
        //             writeError(response, HttpServletResponse.SC_FORBIDDEN,
        //                     "UPGRADE_REQUIRED",
        //                     "This feature requires tier: " + required);
        //             return;
        //         }
        //     }
        // }

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
