package com.coachfit.auth.application.service;

import com.coachfit.auth.adapter.in.StravaOAuthProperties;
import com.coachfit.auth.adapter.out.persistence.AesTokenEncryptionUtil;
import com.coachfit.auth.application.port.in.StravaOAuthUseCase;
import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.model.AuthUser;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Implements the Strava OAuth2 authorization-code flow.
 *
 * <p>Flow (docs/06-sync-engine-spec.md §Strava OAuth Flow, docs/08-auth-model.md §Strava OAuth):
 * <ol>
 *   <li>Build authorization URL with required scopes</li>
 *   <li>Exchange authorization code for access + refresh tokens</li>
 *   <li>Extract athlete profile from Strava token response</li>
 *   <li>Resolve CoachFit user (find by provider ID → find by email → auto-register)</li>
 *   <li>Store/update OAuth connection (AES-256-GCM encrypted tokens)</li>
 *   <li>Issue CoachFit JWT + refresh token</li>
 * </ol>
 *
 * <p>Note: Strava returns the athlete object as part of the token-exchange response,
 * so a separate profile API call is not needed.
 */
@Service
public class StravaOAuthService implements StravaOAuthUseCase {

    private static final Logger log = LoggerFactory.getLogger(StravaOAuthService.class);

    // Provider identifier stored in oauth_connections.provider
    private static final String PROVIDER = "strava";

    // Strava API endpoints
    private static final String STRAVA_AUTH_URL  = "https://www.strava.com/oauth/authorize";
    private static final String STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

    /**
     * Scopes requested from Strava (docs/08-auth-model.md §Strava OAuth).
     * {@code activity:read_all} — full activity history.
     * {@code profile:read_all} — athlete profile including email.
     */
    private static final String STRAVA_SCOPES = "activity:read_all,profile:read_all";

    private final StravaOAuthProperties          stravaProperties;
    private final RestClient                     restClient;
    private final UserPersistencePort            userPort;
    private final OAuthConnectionPersistencePort oauthPort;
    private final AesTokenEncryptionUtil         encryptionUtil;
    private final AuthService                    authService;   // JWT + refresh token helpers

    public StravaOAuthService(StravaOAuthProperties stravaProperties,
                              RestClient restClient,
                              UserPersistencePort userPort,
                              OAuthConnectionPersistencePort oauthPort,
                              AesTokenEncryptionUtil encryptionUtil,
                              AuthService authService) {
        this.stravaProperties = stravaProperties;
        this.restClient       = restClient;
        this.userPort         = userPort;
        this.oauthPort        = oauthPort;
        this.encryptionUtil   = encryptionUtil;
        this.authService      = authService;
    }

    // ── Authorization URL (called by controller) ──────────────────────────────

    /**
     * Builds the Strava authorization URL the browser will be redirected to.
     *
     * @param state CSRF state token (generated and stored in Redis by the controller)
     */
    public String buildAuthorizationUrl(String state) {
        return UriComponentsBuilder
                .fromUriString(STRAVA_AUTH_URL)
                .queryParam("client_id",     stravaProperties.clientId())
                .queryParam("redirect_uri",  stravaProperties.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope",         STRAVA_SCOPES)
                .queryParam("state",         state)
                .queryParam("approval_prompt", "auto")  // only re-prompt if revoked
                .toUriString();
    }

    // ── StravaOAuthUseCase ────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResult handleCallback(String code) {
        // 1. Exchange authorization code for Strava tokens
        StravaTokenResponse tokenResponse = exchangeCode(code);
        log.debug("Strava OAuth token exchange successful for athlete_id={}",
                tokenResponse.athlete() != null ? tokenResponse.athlete().id() : "unknown");

        // 2. Resolve CoachFit user (provider ID → email → auto-register)
        AuthUser user = resolveUser(tokenResponse);

        // 3. Store/update OAuth connection with AES-256-GCM encrypted tokens
        //    (docs/08-auth-model.md §Security Checklist: "AES-256-GCM encrypted in DB")
        Instant expiresAt = tokenResponse.expiresAt() != null
                ? Instant.ofEpochSecond(tokenResponse.expiresAt())
                : null;

        oauthPort.upsert(
                user.id(),
                PROVIDER,
                String.valueOf(tokenResponse.athlete().id()),
                encryptionUtil.encrypt(tokenResponse.accessToken()),
                encryptionUtil.encrypt(tokenResponse.refreshToken()),
                expiresAt,
                new String[]{"activity:read_all", "profile:read_all"});

        // 4. Issue CoachFit JWT + refresh token
        return new AuthResult(
                authService.generateJwt(user),
                user,
                authService.createRefreshToken(user.id()));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Resolves the CoachFit user from the Strava token response using three-step lookup:
     * <ol>
     *   <li>Existing oauth_connection for this Strava athlete ID → load user</li>
     *   <li>Existing user with the same email → link Strava to that account</li>
     *   <li>No match → auto-register a new CoachFit account (no password)</li>
     * </ol>
     * See docs/08-auth-model.md §Strava OAuth.
     */
    private AuthUser resolveUser(StravaTokenResponse tokenResponse) {
        StravaAthlete athlete = tokenResponse.athlete();
        String providerUserId = String.valueOf(athlete.id());

        // Step 1: Check existing Strava connection
        Optional<UUID> existingUserId =
                oauthPort.findUserIdByProviderAndProviderId(PROVIDER, providerUserId);
        if (existingUserId.isPresent()) {
            return userPort.findById(existingUserId.get())
                    .orElseThrow(() -> new IllegalStateException(
                            "OAuth connection references missing user: provider_user_id=" + providerUserId));
        }

        // Strava requires scope profile:read_all to expose email
        String email = athlete.email();

        // Step 2: If Strava returned an email, check for existing CoachFit account
        if (email != null && !email.isBlank()) {
            Optional<AuthUser> byEmail = userPort.findByEmail(email);
            if (byEmail.isPresent()) {
                log.debug("Linking Strava to existing CoachFit account email={}", email);
                return byEmail.get();
            }
        }

        // Step 3: Auto-register a new user
        String displayName = buildDisplayName(athlete);
        String registrationEmail = (email != null && !email.isBlank())
                ? email
                : providerUserId + "@strava.placeholder";   // fallback if no email scope granted

        log.debug("Auto-registering new CoachFit user from Strava athlete_id={}", athlete.id());
        return userPort.createUser(registrationEmail, displayName, null /* no password */);
    }

    /**
     * Exchanges the authorization code for Strava access + refresh tokens.
     * Strava returns the athlete summary as part of the token response.
     */
    private StravaTokenResponse exchangeCode(String code) {
        return restClient.post()
                .uri(STRAVA_TOKEN_URL)
                .body(new StravaTokenRequest(
                        stravaProperties.clientId(),
                        stravaProperties.clientSecret(),
                        code,
                        "authorization_code"))
                .retrieve()
                .body(StravaTokenResponse.class);
    }

    private String buildDisplayName(StravaAthlete athlete) {
        String first = athlete.firstName() != null ? athlete.firstName() : "";
        String last  = athlete.lastName()  != null ? athlete.lastName()  : "";
        String full  = (first + " " + last).trim();
        return full.isEmpty() ? "Strava Athlete" : full;
    }

    // ── Private DTOs (Strava API, not exposed outside this class) ─────────────

    record StravaTokenRequest(
            @JsonProperty("client_id")     String clientId,
            @JsonProperty("client_secret") String clientSecret,
            String code,
            @JsonProperty("grant_type")    String grantType
    ) {}

    record StravaTokenResponse(
            @JsonProperty("access_token")  String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_at")    Long expiresAt,       // Unix epoch seconds
            @JsonProperty("expires_in")    Integer expiresIn,
            @JsonProperty("token_type")    String tokenType,
            StravaAthlete athlete
    ) {}

    record StravaAthlete(
            long   id,
            @JsonProperty("firstname") String firstName,
            @JsonProperty("lastname")  String lastName,
            String email,
            String city,
            String country,
            String sex,
            @JsonProperty("profile")   String profilePhotoUrl
    ) {}
}
