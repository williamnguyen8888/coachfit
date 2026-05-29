package com.coachfit.auth.application.service;

import com.coachfit.auth.adapter.out.persistence.AesTokenEncryptionUtil;
import com.coachfit.auth.application.port.in.GoogleOAuthUseCase;
import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.model.AuthUser;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Implements the Google OAuth2 OIDC login/register flow.
 *
 * <p>Flow (docs/08-auth-model.md §Google OAuth):
 * <ol>
 *   <li>Build authorization URL from Spring's {@link ClientRegistration}</li>
 *   <li>Exchange authorization code for tokens at Google's token endpoint</li>
 *   <li>Fetch user info from Google's userinfo endpoint</li>
 *   <li>Find existing OAuth connection → load user</li>
 *   <li>If not found: look up by email → link Google to existing account</li>
 *   <li>If no existing account: auto-register (no password)</li>
 *   <li>Store/update OAuth connection (encrypted tokens)</li>
 *   <li>Issue CoachFit JWT + refresh token</li>
 * </ol>
 */
@Service
public class GoogleOAuthService implements GoogleOAuthUseCase {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuthService.class);

    private static final String PROVIDER = "google";

    private final ClientRegistration          googleRegistration;
    private final RestClient                  restClient;
    private final UserPersistencePort         userPort;
    private final OAuthConnectionPersistencePort oauthPort;
    private final AesTokenEncryptionUtil      encryptionUtil;
    private final AuthService                 authService;  // for token generation helpers

    public GoogleOAuthService(ClientRegistrationRepository clientRegistrationRepository,
                              UserPersistencePort userPort,
                              OAuthConnectionPersistencePort oauthPort,
                              AesTokenEncryptionUtil encryptionUtil,
                              AuthService authService) {
        this.googleRegistration = clientRegistrationRepository.findByRegistrationId(PROVIDER);
        this.restClient         = RestClient.create();
        this.userPort           = userPort;
        this.oauthPort          = oauthPort;
        this.encryptionUtil     = encryptionUtil;
        this.authService        = authService;
    }

    // ── Authorization URL (called by controller) ──────────────────────────────

    /**
     * Builds the Google authorization URL to redirect the browser to.
     *
     * @param state CSRF state token (generated and stored by the controller)
     */
    public String buildAuthorizationUrl(String state) {
        return UriComponentsBuilder
                .fromUriString(googleRegistration.getProviderDetails().getAuthorizationUri())
                .queryParam("client_id",     googleRegistration.getClientId())
                .queryParam("redirect_uri",  googleRegistration.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope",         String.join(" ", googleRegistration.getScopes()))
                .queryParam("state",         state)
                .queryParam("access_type",   "offline")  // request refresh_token from Google
                .queryParam("prompt",        "consent")  // ensure refresh_token is returned
                .toUriString();
    }

    // ── GoogleOAuthUseCase ────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResult handleCallback(String code) {
        // 1. Exchange code for Google tokens
        GoogleTokenResponse tokens = exchangeCode(code);

        // 2. Fetch user info
        GoogleUserInfo userInfo = fetchUserInfo(tokens.accessToken());
        log.debug("Google OAuth callback for email={}", userInfo.email());

        // 3. Resolve CoachFit user
        AuthUser user = resolveUser(userInfo);

        // 4. Store/update OAuth connection (AES-encrypted)
        Instant expiresAt = tokens.expiresIn() != null
                ? Instant.now().plusSeconds(tokens.expiresIn())
                : null;
        oauthPort.upsert(
                user.id(), PROVIDER, userInfo.sub(),
                encryptionUtil.encrypt(tokens.accessToken()),
                encryptionUtil.encrypt(tokens.refreshToken()),
                expiresAt,
                new String[]{"openid", "email", "profile"});

        // 5. Issue CoachFit JWT + refresh token
        return new AuthResult(
                authService.generateJwt(user),
                user,
                authService.createRefreshToken(user.id()));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private AuthUser resolveUser(GoogleUserInfo userInfo) {
        // Check existing OAuth connection by Google subject ID
        Optional<UUID> existingUserId =
                oauthPort.findUserIdByProviderAndProviderId(PROVIDER, userInfo.sub());
        if (existingUserId.isPresent()) {
            return userPort.findById(existingUserId.get())
                    .orElseThrow(() -> new IllegalStateException("OAuth connection references missing user"));
        }

        // Check existing account by email (link Google to it)
        Optional<AuthUser> byEmail = userPort.findByEmail(userInfo.email());
        if (byEmail.isPresent()) {
            log.debug("Linking Google account to existing user email={}", userInfo.email());
            return byEmail.get();
        }

        // Auto-register new user — no password (Google-only account)
        log.debug("Auto-registering new user from Google OAuth email={}", userInfo.email());
        String name = userInfo.name() != null ? userInfo.name() : userInfo.email();
        return userPort.createUser(userInfo.email(), name, null);
    }

    private GoogleTokenResponse exchangeCode(String code) {
        return restClient.post()
                .uri(googleRegistration.getProviderDetails().getTokenUri())
                .body(new GoogleTokenRequest(
                        code,
                        googleRegistration.getClientId(),
                        googleRegistration.getClientSecret(),
                        googleRegistration.getRedirectUri(),
                        "authorization_code"))
                .retrieve()
                .body(GoogleTokenResponse.class);
    }

    private GoogleUserInfo fetchUserInfo(String accessToken) {
        return restClient.get()
                .uri(googleRegistration.getProviderDetails().getUserInfoEndpoint().getUri())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(GoogleUserInfo.class);
    }

    // ── Private DTOs (Google API, not exposed outside this class) ────────────

    record GoogleTokenRequest(
            String code,
            @JsonProperty("client_id")     String clientId,
            @JsonProperty("client_secret") String clientSecret,
            @JsonProperty("redirect_uri")  String redirectUri,
            @JsonProperty("grant_type")    String grantType
    ) {}

    record GoogleTokenResponse(
            @JsonProperty("access_token")  String accessToken,
            @JsonProperty("token_type")    String tokenType,
            @JsonProperty("expires_in")    Integer expiresIn,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("id_token")      String idToken
    ) {}

    record GoogleUserInfo(
            String sub,
            String email,
            String name,
            String picture
    ) {}
}
