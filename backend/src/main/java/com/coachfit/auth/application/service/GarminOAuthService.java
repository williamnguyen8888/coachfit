package com.coachfit.auth.application.service;

import com.coachfit.auth.adapter.in.GarminOAuthProperties;
import com.coachfit.auth.adapter.out.persistence.AesTokenEncryptionUtil;
import com.coachfit.auth.application.port.in.GarminOAuthUseCase;
import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.auth.domain.model.AuthUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implements the Garmin Health API OAuth 1.0a three-legged authorization flow.
 *
 * <p>Flow (docs/08-auth-model.md §Garmin OAuth (Phase 1), docs/06-sync-engine-spec.md §OAuth 1.0a Flow):
 * <ol>
 *   <li>POST /oauth-service/oauth/request_token → temporary oauth_token + oauth_token_secret</li>
 *   <li>Redirect user to https://connect.garmin.com/oauthConfirm?oauth_token=...</li>
 *   <li>User authorizes → Garmin POSTs back to callback with oauth_token + oauth_verifier</li>
 *   <li>POST /oauth-service/oauth/access_token → permanent access_token + access_token_secret</li>
 *   <li>Store AES-256-GCM encrypted tokens in {@code oauth_connections}</li>
 * </ol>
 *
 * <p>OAuth 1.0a tokens do NOT expire — no refresh flow is required.
 * The {@code access_token_secret} is stored in the {@code access_token_secret} column
 * and needed for every HMAC-SHA1 signed request to Garmin.
 *
 * <p><strong>HMAC-SHA1 signing:</strong> implemented here using standard JDK {@link Mac}
 * — no extra OAuth library dependency required.
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Health API Integration.
 */
@Service
public class GarminOAuthService implements GarminOAuthUseCase {

    private static final Logger log = LoggerFactory.getLogger(GarminOAuthService.class);

    // Provider identifier stored in oauth_connections.provider
    private static final String PROVIDER = "garmin";

    // Garmin Health API OAuth 1.0a endpoints
    private static final String GARMIN_REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
    private static final String GARMIN_AUTH_URL          = "https://connect.garmin.com/oauthConfirm";
    private static final String GARMIN_ACCESS_TOKEN_URL  = "https://connectapi.garmin.com/oauth-service/oauth/access_token";

    private static final String OAUTH_VERSION             = "1.0";
    private static final String OAUTH_SIGNATURE_METHOD    = "HMAC-SHA1";
    private static final String HMAC_SHA1_ALGORITHM       = "HmacSHA1";

    private final GarminOAuthProperties          garminProperties;
    private final RestClient                     restClient;
    private final UserPersistencePort            userPort;
    private final OAuthConnectionPersistencePort oauthPort;
    private final AesTokenEncryptionUtil         encryptionUtil;
    private final AuthService                    authService;
    private final SecureRandom                   secureRandom = new SecureRandom();

    public GarminOAuthService(GarminOAuthProperties garminProperties,
                              RestClient restClient,
                              UserPersistencePort userPort,
                              OAuthConnectionPersistencePort oauthPort,
                              AesTokenEncryptionUtil encryptionUtil,
                              AuthService authService) {
        this.garminProperties = garminProperties;
        this.restClient        = restClient;
        this.userPort          = userPort;
        this.oauthPort         = oauthPort;
        this.encryptionUtil    = encryptionUtil;
        this.authService       = authService;
    }

    // ── GarminOAuthUseCase: step 1 — request token ───────────────────────────

    /**
     * Obtains a temporary request token from Garmin's OAuth service.
     *
     * <p>Sends a signed POST to {@code /oauth-service/oauth/request_token} with
     * {@code oauth_callback} set to our redirect URI. Garmin responds with a
     * URL-encoded body: {@code oauth_token=...&oauth_token_secret=...&oauth_callback_confirmed=true}.
     *
     * @return temporary credentials + authorization redirect URL
     */
    @Override
    public RequestTokenResult initiateOAuth() {
        String nonce     = generateNonce();
        String timestamp = currentTimestamp();

        // For the request-token step, the token secret component of the signing key is empty
        // (composite key = consumerSecret& — note the trailing ampersand)
        String authHeader = buildOAuthHeader(
                "POST", GARMIN_REQUEST_TOKEN_URL,
                /* oauthToken */ null, /* tokenSecret */ null,
                nonce, timestamp,
                Map.of("oauth_callback", encode(garminProperties.redirectUri())));

        String responseBody = restClient.post()
                .uri(GARMIN_REQUEST_TOKEN_URL)
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("oauth_callback=" + encode(garminProperties.redirectUri()))
                .retrieve()
                .body(String.class);

        Map<String, String> params = parseUrlEncoded(responseBody);
        String oauthToken       = params.get("oauth_token");
        String oauthTokenSecret = params.get("oauth_token_secret");

        if (oauthToken == null || oauthTokenSecret == null) {
            throw new IllegalStateException(
                    "Garmin request_token response missing required fields: " + responseBody);
        }

        String authorizationUrl = UriComponentsBuilder
                .fromUriString(GARMIN_AUTH_URL)
                .queryParam("oauth_token", oauthToken)
                .toUriString();

        log.debug("Garmin OAuth 1.0a: obtained request token, redirecting to {}", authorizationUrl);
        return new RequestTokenResult(oauthToken, oauthTokenSecret, authorizationUrl);
    }

    // ── GarminOAuthUseCase: step 3 — access token exchange ───────────────────

    /**
     * Exchanges the temporary credentials for permanent access tokens, then resolves or
     * creates the CoachFit user and stores the encrypted tokens.
     *
     * <p>Sends a signed POST to {@code /oauth-service/oauth/access_token} using the
     * request token + verifier. Garmin responds with the permanent
     * {@code access_token} and {@code access_token_secret}.
     *
     * <p>The {@code access_token_secret} is stored encrypted in the {@code access_token_secret}
     * column of {@code oauth_connections}. It is required for every subsequent signed request.
     *
     * <p>OAuth 1.0a tokens never expire (docs/08-auth-model.md §Garmin OAuth).
     */
    @Override
    @Transactional
    public AuthResult handleCallback(String oauthToken, String oauthVerifier, String requestSecret) {
        // 1. Exchange for permanent access tokens
        AccessTokens tokens = exchangeForAccessToken(oauthToken, oauthVerifier, requestSecret);
        log.debug("Garmin OAuth 1.0a: access token exchange successful for userAccessToken={}",
                maskToken(tokens.accessToken()));

        // 2. Resolve or create CoachFit user
        //    Garmin doesn't return a profile in the OAuth response — we use userAccessToken as the
        //    provider_user_id (the Garmin Health API uses this as the user identity in push payloads)
        AuthUser user = resolveUser(tokens.accessToken());

        // 3. Persist OAuth connection with encrypted tokens
        //    - access_token     → encrypted in access_token column
        //    - token secret     → encrypted in access_token_secret column
        //    - refresh_token    → null (OAuth 1.0a, tokens don't expire)
        //    - token_expires_at → null (OAuth 1.0a, tokens don't expire)
        //    Docs/08-auth-model.md §Security Checklist: "AES-256-GCM encrypted in DB"
        oauthPort.upsertWithSecret(
                user.id(),
                PROVIDER,
                tokens.accessToken(),                       // used as provider_user_id
                encryptionUtil.encrypt(tokens.accessToken()),
                null,                                       // no refresh token for OAuth 1.0a
                encryptionUtil.encrypt(tokens.accessTokenSecret()),
                null,                                       // no expiry for OAuth 1.0a
                new String[0]);                             // no scopes for Garmin

        // 4. Issue CoachFit JWT + refresh token
        return new AuthResult(
                authService.generateJwt(user),
                user,
                authService.createRefreshToken(user.id()));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Calls Garmin's access_token endpoint with the request token + verifier.
     * Returns the permanent access_token and access_token_secret.
     */
    private AccessTokens exchangeForAccessToken(String oauthToken,
                                                String oauthVerifier,
                                                String requestTokenSecret) {
        String nonce     = generateNonce();
        String timestamp = currentTimestamp();

        // Additional OAuth params for this step
        Map<String, String> extraParams = Map.of("oauth_verifier", encode(oauthVerifier));

        String authHeader = buildOAuthHeader(
                "POST", GARMIN_ACCESS_TOKEN_URL,
                oauthToken, requestTokenSecret,
                nonce, timestamp,
                extraParams);

        String responseBody = restClient.post()
                .uri(GARMIN_ACCESS_TOKEN_URL)
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("oauth_verifier=" + encode(oauthVerifier))
                .retrieve()
                .body(String.class);

        Map<String, String> params = parseUrlEncoded(responseBody);
        String accessToken       = params.get("oauth_token");
        String accessTokenSecret = params.get("oauth_token_secret");

        if (accessToken == null || accessTokenSecret == null) {
            throw new IllegalStateException(
                    "Garmin access_token response missing required fields: " + responseBody);
        }

        return new AccessTokens(accessToken, accessTokenSecret);
    }

    /**
     * Resolves the CoachFit user for a Garmin connection.
     *
     * <p>Garmin does not provide an email or profile in the OAuth response.
     * We use the {@code access_token} (the Garmin user access token) as the
     * {@code provider_user_id} — Garmin embeds it in every push payload as
     * {@code userAccessToken}, which is how we correlate push data to CoachFit users.
     *
     * <p>Resolution order:
     * <ol>
     *   <li>Existing Garmin connection by userAccessToken → load user</li>
     *   <li>No match → auto-register a new CoachFit account (no password, no email yet)</li>
     * </ol>
     */
    private AuthUser resolveUser(String garminUserAccessToken) {
        Optional<UUID> existingUserId =
                oauthPort.findUserIdByProviderAndProviderId(PROVIDER, garminUserAccessToken);

        if (existingUserId.isPresent()) {
            return userPort.findById(existingUserId.get())
                    .orElseThrow(() -> new IllegalStateException(
                            "OAuth connection references missing user: garmin provider_user_id=" + maskToken(garminUserAccessToken)));
        }

        // Auto-register: Garmin has no email in OAuth — use a placeholder.
        // The user can add their real email in settings later.
        String placeholder = garminUserAccessToken + "@garmin.placeholder";
        log.debug("Auto-registering new CoachFit user from Garmin connection");
        return userPort.createUser(placeholder, "Garmin Athlete", null /* no password */);
    }

    // ── HMAC-SHA1 OAuth 1.0a signing ─────────────────────────────────────────

    /**
     * Builds the OAuth 1.0a {@code Authorization} header using HMAC-SHA1 signing.
     *
     * <p>Algorithm (RFC 5849 §3):
     * <ol>
     *   <li>Collect all oauth_* parameters + any request body params</li>
     *   <li>Percent-encode and sort them</li>
     *   <li>Build the Signature Base String: METHOD&encoded_url&encoded_params</li>
     *   <li>Sign with HMAC-SHA1 using key = consumerSecret&tokenSecret</li>
     *   <li>Append oauth_signature to the Authorization header</li>
     * </ol>
     *
     * @param method      HTTP method (POST, GET)
     * @param url         the request URL (without query string)
     * @param oauthToken  the current oauth_token (null for request_token step)
     * @param tokenSecret the current token secret (null for request_token step)
     * @param nonce       a unique nonce for this request
     * @param timestamp   Unix timestamp in seconds
     * @param extraParams additional OAuth params included in the signature base (e.g. oauth_verifier, oauth_callback)
     */
    private String buildOAuthHeader(String method, String url,
                                    String oauthToken, String tokenSecret,
                                    String nonce, String timestamp,
                                    Map<String, String> extraParams) {

        // Collect core OAuth params (sorted map for deterministic base string)
        Map<String, String> oauthParams = new LinkedHashMap<>();
        oauthParams.put("oauth_consumer_key",     garminProperties.consumerKey());
        oauthParams.put("oauth_nonce",            nonce);
        oauthParams.put("oauth_signature_method", OAUTH_SIGNATURE_METHOD);
        oauthParams.put("oauth_timestamp",        timestamp);
        oauthParams.put("oauth_version",          OAUTH_VERSION);
        if (oauthToken != null) {
            oauthParams.put("oauth_token", oauthToken);
        }
        oauthParams.putAll(extraParams);

        // Build signature base string
        String signatureBase = buildSignatureBaseString(method, url, oauthParams);

        // Signing key = consumerSecret&tokenSecret (token secret is empty string if null)
        String signingKey = encode(garminProperties.consumerSecret()) + "&"
                + (tokenSecret != null ? encode(tokenSecret) : "");

        String signature = hmacSha1Base64(signatureBase, signingKey);

        // Build Authorization header — only core oauth_* params (not oauth_callback / oauth_verifier)
        // oauth_callback and oauth_verifier go in the body AND the signature, but NOT in the header
        StringBuilder header = new StringBuilder("OAuth ");
        header.append("oauth_consumer_key=\"").append(encode(garminProperties.consumerKey())).append("\",");
        header.append("oauth_nonce=\"").append(encode(nonce)).append("\",");
        header.append("oauth_signature=\"").append(encode(signature)).append("\",");
        header.append("oauth_signature_method=\"").append(OAUTH_SIGNATURE_METHOD).append("\",");
        header.append("oauth_timestamp=\"").append(timestamp).append("\",");
        header.append("oauth_version=\"").append(OAUTH_VERSION).append("\"");
        if (oauthToken != null) {
            header.append(",oauth_token=\"").append(encode(oauthToken)).append("\"");
        }

        return header.toString();
    }

    /**
     * Builds the OAuth 1.0a Signature Base String (RFC 5849 §3.4.1).
     *
     * <p>Format: {@code METHOD&percent_encoded_base_url&percent_encoded_normalized_params}
     */
    private String buildSignatureBaseString(String method, String url,
                                            Map<String, String> oauthParams) {
        // Normalize and sort all parameters
        String normalizedParams = oauthParams.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));

        return method.toUpperCase() + "&" + encode(url) + "&" + encode(normalizedParams);
    }

    /**
     * Signs the given data with HMAC-SHA1 and returns the Base64-encoded result.
     */
    private String hmacSha1Base64(String data, String key) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA1_ALGORITHM);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC_SHA1_ALGORITHM));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA1 signing failed", e);
        }
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    /** RFC 3986 percent-encoding (stricter than {@link java.net.URLEncoder}). */
    private static String encode(String value) {
        if (value == null) return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("*", "%2A")
                .replace("%7E", "~");
    }

    /** Parses a URL-encoded response body into a key→value map. */
    private static Map<String, String> parseUrlEncoded(String body) {
        if (body == null || body.isBlank()) return Map.of();
        Map<String, String> result = new LinkedHashMap<>();
        for (String pair : body.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                result.put(
                        java.net.URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                        java.net.URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return result;
    }

    /** Generates a random nonce (16-byte hex string). */
    private String generateNonce() {
        byte[] bytes = new byte[16];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    /** Returns the current Unix epoch time in seconds as a string. */
    private static String currentTimestamp() {
        return String.valueOf(Instant.now().getEpochSecond());
    }

    /** Masks a token for safe logging — shows first 8 chars only. */
    private static String maskToken(String token) {
        if (token == null || token.length() <= 8) return "***";
        return token.substring(0, 8) + "***";
    }

    // ── Private DTO ───────────────────────────────────────────────────────────

    /** Permanent Garmin access credentials returned after the verifier exchange. */
    private record AccessTokens(String accessToken, String accessTokenSecret) {}
}
