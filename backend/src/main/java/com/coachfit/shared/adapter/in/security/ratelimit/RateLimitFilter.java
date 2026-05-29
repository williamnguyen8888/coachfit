package com.coachfit.shared.adapter.in.security.ratelimit;

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
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Last filter in the CoachFit security chain — enforces per-user daily request limits.
 *
 * <h3>Rate limits by tier (docs/08-auth-model.md)</h3>
 * <pre>
 * free   → 500  req/day
 * pro    → 5,000 req/day
 * elite  → 20,000 req/day
 * coach  → 20,000 req/day
 * </pre>
 *
 * <h3>Redis key pattern (docs/08-auth-model.md)</h3>
 * <pre>
 * rate_limit:{userId}:{YYYY-MM-DD}   → counter (INCR), TTL 86400s
 * </pre>
 *
 * <h3>Response headers set on every authenticated response</h3>
 * <ul>
 *   <li>{@code X-RateLimit-Limit} — tier limit</li>
 *   <li>{@code X-RateLimit-Remaining} — requests remaining today</li>
 *   <li>{@code X-RateLimit-Reset} — UTC epoch second of next day midnight</li>
 * </ul>
 *
 * <p>Unauthenticated requests are skipped (per-endpoint limits for login/register/webhooks
 * are handled inside the respective feature-module controllers).
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final String KEY_PREFIX = "rate_limit:";
    private static final long   TTL_SECONDS = 86_400L;

    // ── Tier limits (docs/08-auth-model.md §Rate Limiting) ───────────────────
    private static final Map<String, Long> TIER_LIMITS = Map.of(
            "free",  500L,
            "pro",   5_000L,
            "elite", 20_000L,
            "coach", 20_000L,
            "admin", Long.MAX_VALUE   // admin is unrestricted
    );
    private static final long DEFAULT_LIMIT = 500L;

    // ── Response headers (docs/05-api-design.md §Conventions) ────────────────
    private static final String HEADER_LIMIT     = "X-RateLimit-Limit";
    private static final String HEADER_REMAINING = "X-RateLimit-Remaining";
    private static final String HEADER_RESET     = "X-RateLimit-Reset";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper        objectMapper;

    public RateLimitFilter(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
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
            // Unauthenticated — skip rate limiting (per-endpoint limits handled in controllers).
            filterChain.doFilter(request, response);
            return;
        }

        UUID   userId = principal.getUserId();
        String tier   = principal.getTier() != null ? principal.getTier().toLowerCase() : "free";
        long   limit  = TIER_LIMITS.getOrDefault(tier, DEFAULT_LIMIT);

        String today  = LocalDate.now(ZoneOffset.UTC).toString();   // "YYYY-MM-DD"
        String redisKey = KEY_PREFIX + userId + ":" + today;

        // INCR (atomic) — if key doesn't exist, Redis creates it with value 1.
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count == null) count = 1L;

        // Set TTL only on first increment (when count == 1) to avoid resetting on every request.
        if (count == 1L) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(TTL_SECONDS));
        }

        long remaining = Math.max(0L, limit - count);
        long resetEpoch = nextMidnightUtcEpoch();

        // Always write rate-limit headers.
        response.setHeader(HEADER_LIMIT,     String.valueOf(limit));
        response.setHeader(HEADER_REMAINING, String.valueOf(remaining));
        response.setHeader(HEADER_RESET,     String.valueOf(resetEpoch));

        if (count > limit) {
            log.warn("Rate limit exceeded for user {} (tier={}, count={}, limit={})",
                    userId, tier, count, limit);
            writeError(response, 429, "RATE_LIMIT_EXCEEDED",
                    "Daily request limit of " + limit + " exceeded. Resets at midnight UTC.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private long nextMidnightUtcEpoch() {
        return ZonedDateTime.now(ZoneOffset.UTC)
                .toLocalDate()
                .plusDays(1)
                .atStartOfDay(ZoneOffset.UTC)
                .toEpochSecond();
    }

    private void writeError(HttpServletResponse response, int status,
                            String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiErrorResponse body = new ApiErrorResponse(new ApiError(code, message));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
