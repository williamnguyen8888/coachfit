package com.coachfit.shared.adapter.in.security;

import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.shared.adapter.in.security.apikey.ApiKeyAuthenticationFilter;
import com.coachfit.shared.adapter.in.security.featuregate.FeatureGateFilter;
import com.coachfit.shared.adapter.in.security.jwt.JwtAuthenticationFilter;
import com.coachfit.shared.adapter.in.security.jwt.JwtProperties;
import com.coachfit.shared.adapter.in.security.jwt.JwtTokenProvider;
import com.coachfit.shared.adapter.in.security.ratelimit.RateLimitFilter;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Core Spring Security configuration for CoachFit.
 *
 * <h3>Filter chain order (docs/08-auth-model.md §Spring Security Filter Chain)</h3>
 * <pre>
 * Request
 *   → CorsFilter                     (Spring Security built-in via corsConfigurationSource)
 *     → JwtAuthenticationFilter      (order 1 — extract + validate JWT)
 *       → ApiKeyAuthenticationFilter (order 2 — fallback if no JWT)
 *         → FeatureGateFilter        (order 3 — tier-change blacklist + @RequiresTier)
 *           → RateLimitFilter        (order 4 — Redis daily counter + headers)
 *             → Controller
 * </pre>
 *
 * <h3>Public endpoints (no auth required)</h3>
 * <ul>
 *   <li>{@code POST /api/v1/auth/**} — register, login, refresh, OAuth callbacks</li>
 *   <li>{@code GET  /api/v1/auth/**} — OAuth initiation flows</li>
 *   <li>{@code POST /api/v1/webhooks/**} — Strava, Garmin, Stripe webhooks</li>
 *   <li>{@code GET  /api/v1/webhooks/**} — Strava webhook verification</li>
 *   <li>{@code GET  /join/**} — public athlete invite-link acceptance</li>
 *   <li>{@code GET  /actuator/health} — liveness / readiness probes</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties({JwtProperties.class, CorsProperties.class})
class SecurityConfig {

    // ── Filter chain ──────────────────────────────────────────────────────────

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            JwtAuthenticationFilter jwtFilter,
                                            ApiKeyAuthenticationFilter apiKeyFilter,
                                            FeatureGateFilter featureGateFilter,
                                            RateLimitFilter rateLimitFilter,
                                            CorsConfigurationSource corsConfigurationSource,
                                            ObjectMapper objectMapper) throws Exception {

        http
            // ── Stateless: no sessions, no CSRF ──────────────────────────────
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(AbstractHttpConfigurer::disable)

            // ── Disable Spring Boot's auto-configured OAuth2 login filter ─────
            // We implement a custom OIDC flow in auth.adapter.in.GoogleOAuthController.
            // This prevents the /oauth2/authorization/* and /login/oauth2/code/* endpoints
            // from being activated while still allowing ClientRegistrationRepository to work.
            .oauth2Login(AbstractHttpConfigurer::disable)

            // ── CORS ─────────────────────────────────────────────────────────
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // ── Authorization rules ───────────────────────────────────────────
            .authorizeHttpRequests(auth -> auth
                    // Auth endpoints — public
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/**").permitAll()
                    .requestMatchers(HttpMethod.GET,  "/api/v1/auth/**").permitAll()
                    // Webhook endpoints — public (secured by payload signature in controllers)
                    .requestMatchers("/api/v1/webhooks/**").permitAll()
                    // Invite link acceptance — public
                    .requestMatchers(HttpMethod.GET, "/join/**").permitAll()
                    // Actuator health probes — public
                    .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                    // OpenAPI / Swagger UI — public (docs/05-api-design.md conventions)
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                    // Everything else requires authentication
                    .anyRequest().authenticated()
            )

            // ── Custom AuthenticationEntryPoint → 401 JSON ────────────────────
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((request, response, authException) -> {
                        response.setStatus(401);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        ApiErrorResponse body = new ApiErrorResponse(
                                new ApiError("UNAUTHORIZED", "Authentication required."));
                        response.getWriter().write(objectMapper.writeValueAsString(body));
                    })
                    .accessDeniedHandler((request, response, accessDeniedException) -> {
                        response.setStatus(403);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        ApiErrorResponse body = new ApiErrorResponse(
                                new ApiError("FORBIDDEN",
                                        "You do not have permission to access this resource."));
                        response.getWriter().write(objectMapper.writeValueAsString(body));
                    })
            )

            // ── Custom filter chain ───────────────────────────────────────────
            // Inserted before Spring's default UsernamePasswordAuthenticationFilter
            // so our JWT/ApiKey filters run first in the chain.
            .addFilterBefore(jwtFilter,          UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(apiKeyFilter,        jwtFilter.getClass())
            .addFilterAfter(featureGateFilter,   apiKeyFilter.getClass())
            .addFilterAfter(rateLimitFilter,     featureGateFilter.getClass());

        return http.build();
    }

    // ── Filter beans ──────────────────────────────────────────────────────────

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }

    @Bean
    ApiKeyAuthenticationFilter apiKeyAuthenticationFilter(ApiKeyPersistencePort apiKeyPersistencePort,
                                                          UserPersistencePort userPersistencePort) {
        return new ApiKeyAuthenticationFilter(apiKeyPersistencePort, userPersistencePort);
    }

    @Bean
    FeatureGateFilter featureGateFilter(StringRedisTemplate redisTemplate,
                                        ObjectMapper objectMapper,
                                        RequestMappingHandlerMapping requestMappingHandlerMapping) {
        return new FeatureGateFilter(redisTemplate, objectMapper, requestMappingHandlerMapping);
    }

    @Bean
    RateLimitFilter rateLimitFilter(StringRedisTemplate redisTemplate,
                                    ObjectMapper objectMapper) {
        return new RateLimitFilter(redisTemplate, objectMapper);
    }

    // ── JWT provider ──────────────────────────────────────────────────────────

    @Bean
    JwtTokenProvider jwtTokenProvider(JwtProperties jwtProperties) {
        return new JwtTokenProvider(jwtProperties);
    }

    // ── CORS ──────────────────────────────────────────────────────────────────

    /**
     * CORS configuration sourced from {@code app.url} (docs/08-auth-model.md §Security Checklist:
     * "CORS — Whitelist frontend domain only").
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(corsProperties.url()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "Accept",
                "Idempotency-Key", "X-API-Version"));
        config.setExposedHeaders(List.of(
                "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset",
                "X-API-Version"));
        config.setAllowCredentials(true);   // needed for httpOnly refresh-token cookie
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ── Password encoder ──────────────────────────────────────────────────────

    /**
     * BCrypt with strength 12 (docs/08-auth-model.md §Security Checklist:
     * "Password storage — BCrypt (strength 12)").
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    // ── RestClient ────────────────────────────────────────────────────────────

    /**
     * Shared {@link RestClient} instance used by {@code GoogleOAuthService}
     * to call Google's token and userinfo endpoints.
     */
    @Bean
    RestClient restClient() {
        return RestClient.create();
    }
}
