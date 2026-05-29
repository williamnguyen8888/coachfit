package com.coachfit.auth.adapter.in;

import com.coachfit.auth.application.port.in.GarminOAuthUseCase;
import com.coachfit.auth.application.service.GarminOAuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Duration;

/**
 * Controller for Garmin OAuth 1.0a three-legged authorization flow.
 *
 * <pre>
 * GET /api/v1/auth/oauth/garmin           → 302 redirect to Garmin authorization page
 * GET /api/v1/auth/oauth/garmin/callback  → exchange verifier for access tokens, issue JWT, redirect to frontend
 * </pre>
 *
 * <h3>Request token secret storage</h3>
 * OAuth 1.0a requires the request_token_secret (obtained in step 1) to be available when
 * exchanging the verifier in step 3. Since the callback may land on a different server instance,
 * the secret is stored in Redis keyed by {@code oauth_token} with a 10-minute TTL.
 *
 * <h3>No CSRF state token needed</h3>
 * Unlike OAuth 2.0, OAuth 1.0a uses the signed {@code oauth_token} parameter itself as
 * the request binding. The callback verifier is only useful paired with the matching
 * request token secret — replay attacks are not possible.
 *
 * <h3>Error handling</h3>
 * Any errors redirect to {@code /auth/error} on the frontend with a {@code reason}
 * query parameter — stack traces are never exposed in redirects.
 *
 * <p>See docs/08-auth-model.md §Garmin OAuth (Phase 1).
 * See docs/06-sync-engine-spec.md §Garmin OAuth 1.0a Flow.
 */
@RestController
@RequestMapping("/api/v1/auth/oauth/garmin")
public class GarminOAuthController {

    private static final Logger log = LoggerFactory.getLogger(GarminOAuthController.class);

    private static final String COOKIE_NAME         = "refresh_token";
    private static final String COOKIE_PATH         = "/api/v1/auth";
    /** Redis key prefix: oauth_garmin_secret:{oauth_token} → request_token_secret */
    private static final String REQUEST_SECRET_PREFIX = "oauth_garmin_secret:";
    /** TTL for request token secret — Garmin typically grants the user 10 minutes to authorize. */
    private static final Duration REQUEST_SECRET_TTL  = Duration.ofMinutes(10);

    private final GarminOAuthService   garminOAuthService;
    private final GarminOAuthUseCase   garminOAuthUseCase;
    private final StringRedisTemplate  redisTemplate;
    private final String               appUrl;
    private final boolean              cookieSecure;

    public GarminOAuthController(GarminOAuthService garminOAuthService,
                                 GarminOAuthUseCase garminOAuthUseCase,
                                 StringRedisTemplate redisTemplate,
                                 @Value("${app.url}") String appUrl,
                                 @Value("${app.security.refresh-cookie-secure:true}") boolean cookieSecure) {
        this.garminOAuthService = garminOAuthService;
        this.garminOAuthUseCase = garminOAuthUseCase;
        this.redisTemplate      = redisTemplate;
        this.appUrl             = appUrl;
        this.cookieSecure       = cookieSecure;
    }

    // ── GET /auth/oauth/garmin — initiate ─────────────────────────────────────

    /**
     * Step 1: Obtains a temporary request token from Garmin and redirects the browser
     * to the Garmin authorization page.
     *
     * <p>Docs/06-sync-engine-spec.md §Garmin OAuth 1.0a Flow step 1–2:
     * "Request token: POST /oauth-service/oauth/request_token
     *  Redirect user: https://connect.garmin.com/oauthConfirm?oauth_token=..."
     *
     * <p>The request_token_secret is stored in Redis (keyed by oauth_token) so it is
     * available in the callback handler regardless of which server instance handles it.
     */
    @GetMapping
    public void initiateOAuth(HttpServletResponse response) throws IOException {
        GarminOAuthUseCase.RequestTokenResult tokenResult;
        try {
            tokenResult = garminOAuthUseCase.initiateOAuth();
        } catch (Exception e) {
            log.error("Garmin OAuth 1.0a: failed to obtain request token", e);
            response.sendRedirect(appUrl + "/auth/error?reason=provider_error");
            return;
        }

        // Store the request_token_secret in Redis — needed during callback exchange
        redisTemplate.opsForValue().set(
                REQUEST_SECRET_PREFIX + tokenResult.oauthToken(),
                tokenResult.oauthTokenSecret(),
                REQUEST_SECRET_TTL);

        log.debug("Garmin OAuth 1.0a: redirecting user to Garmin authorization page");
        response.sendRedirect(tokenResult.authorizationUrl());
    }

    // ── GET /auth/oauth/garmin/callback ───────────────────────────────────────

    /**
     * Step 3: Handles Garmin's callback after user authorization.
     *
     * <p>Docs/06-sync-engine-spec.md §Garmin OAuth 1.0a Flow steps 3–5:
     * "User authorize → callback with oauth_verifier
     *  Exchange: POST /oauth-service/oauth/access_token → access_token + access_token_secret
     *  Store in oauth_connections (access_token_secret field, OAuth 1.0a doesn't expire)"
     *
     * @param oauthToken    the temporary oauth_token echoed back by Garmin (used to look up our secret)
     * @param oauthVerifier the verifier issued by Garmin after user authorization
     */
    @GetMapping("/callback")
    public void handleCallback(@RequestParam(name = "oauth_token",    required = false) String oauthToken,
                               @RequestParam(name = "oauth_verifier", required = false) String oauthVerifier,
                               HttpServletResponse response) throws IOException {

        // Validate the oauth_token is present
        if (oauthToken == null || oauthToken.isBlank()) {
            log.warn("Garmin OAuth callback received no oauth_token");
            response.sendRedirect(appUrl + "/auth/error?reason=missing_token");
            return;
        }

        // Validate the oauth_verifier is present (absent means user cancelled)
        if (oauthVerifier == null || oauthVerifier.isBlank()) {
            log.info("Garmin OAuth cancelled by user: oauth_token={}", oauthToken);
            response.sendRedirect(appUrl + "/auth/error?reason=access_denied");
            return;
        }

        // Retrieve the request_token_secret we stored in step 1
        String requestSecret = redisTemplate.opsForValue().get(REQUEST_SECRET_PREFIX + oauthToken);
        if (requestSecret == null) {
            log.warn("Garmin OAuth callback: request_token_secret not found in Redis (expired or unknown token)");
            response.sendRedirect(appUrl + "/auth/error?reason=session_expired");
            return;
        }
        // Consume the secret — one-use only
        redisTemplate.delete(REQUEST_SECRET_PREFIX + oauthToken);

        // Exchange verifier for permanent access tokens, resolve/create user, issue JWT
        GarminOAuthUseCase.AuthResult result;
        try {
            result = garminOAuthUseCase.handleCallback(oauthToken, oauthVerifier, requestSecret);
        } catch (Exception e) {
            log.error("Garmin OAuth 1.0a: access token exchange failed", e);
            response.sendRedirect(appUrl + "/auth/error?reason=token_exchange_failed");
            return;
        }

        // Set httpOnly refresh token cookie (docs/08-auth-model.md §JWT Structure)
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(result.rawRefreshToken()).toString());

        // Redirect frontend to read the access token and move it to in-memory storage
        response.sendRedirect(appUrl + "/auth/callback?token=" + result.accessToken());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseCookie refreshCookie(String rawToken) {
        return ResponseCookie.from(COOKIE_NAME, rawToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path(COOKIE_PATH)
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .build();
    }
}
