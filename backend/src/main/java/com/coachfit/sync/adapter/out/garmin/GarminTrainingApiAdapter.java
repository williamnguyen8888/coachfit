package com.coachfit.sync.adapter.out.garmin;

import com.coachfit.auth.adapter.in.GarminOAuthProperties;
import com.coachfit.auth.adapter.out.persistence.AesTokenEncryptionUtil;
import com.coachfit.sync.application.port.out.GarminTrainingPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * HTTP adapter implementing {@link GarminTrainingPort}.
 *
 * <p>Calls the Garmin Training API using OAuth 1.0a signed requests.
 * The user's access token and secret are retrieved from {@code oauth_connections}
 * (decrypted from AES-256-GCM storage).
 *
 * <h3>Garmin Training API base URL</h3>
 * {@code https://apis.garmin.com/training-api/}
 *
 * <h3>Endpoints used</h3>
 * <ul>
 *   <li>{@code POST   /training-api/workout}                          — create workout</li>
 *   <li>{@code PUT    /training-api/workout/{workoutId}}              — update workout</li>
 *   <li>{@code POST   /training-api/workout/{workoutId}/schedule}     — schedule workout</li>
 *   <li>{@code DELETE /training-api/workout/{workoutId}/schedule/{id}}— remove schedule</li>
 *   <li>{@code DELETE /training-api/workout/{workoutId}}              — delete workout</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Training API Integration.
 */
@Component
class GarminTrainingApiAdapter implements GarminTrainingPort {

    private static final Logger log = LoggerFactory.getLogger(GarminTrainingApiAdapter.class);

    private static final String TRAINING_API_BASE     = "https://apis.garmin.com/training-api";
    private static final String OAUTH_SIGNATURE_METHOD = "HMAC-SHA1";
    private static final String HMAC_SHA1_ALGORITHM    = "HmacSHA1";
    private static final String OAUTH_VERSION          = "1.0";

    private final GarminOAuthProperties  garminProperties;
    private final AesTokenEncryptionUtil encryptionUtil;
    private final JdbcClient             jdbcClient;
    private final RestClient             restClient;
    private final ObjectMapper           objectMapper;
    private final SecureRandom           secureRandom = new SecureRandom();

    GarminTrainingApiAdapter(GarminOAuthProperties garminProperties,
                              AesTokenEncryptionUtil encryptionUtil,
                              JdbcClient jdbcClient,
                              RestClient restClient,
                              ObjectMapper objectMapper) {
        this.garminProperties = garminProperties;
        this.encryptionUtil    = encryptionUtil;
        this.jdbcClient        = jdbcClient;
        this.restClient        = restClient;
        this.objectMapper      = objectMapper;
    }

    // ── GarminTrainingPort implementation ─────────────────────────────────────

    @Override
    public String upsertWorkout(UUID userId, String workoutPayload, Optional<String> existingId) {
        GarminTokens tokens = loadTokens(userId);

        try {
            if (existingId.isPresent()) {
                // PUT — update existing workout definition
                String url = TRAINING_API_BASE + "/workout/" + existingId.get();
                signedPut(url, tokens, workoutPayload);
                log.debug("Garmin Training API: updated workout id={} userId={}", existingId.get(), userId);
                return existingId.get();
            } else {
                // POST — create new workout definition
                String url = TRAINING_API_BASE + "/workout";
                String responseBody = signedPost(url, tokens, workoutPayload);
                String garminWorkoutId = extractId(responseBody, "workoutId");
                log.info("Garmin Training API: created workout id={} userId={}", garminWorkoutId, userId);
                return garminWorkoutId;
            }
        } catch (RestClientResponseException e) {
            throw new GarminTrainingException(
                    "Garmin Training API upsertWorkout failed: HTTP " + e.getStatusCode() + " — " + e.getResponseBodyAsString(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            throw new GarminTrainingException("Garmin Training API upsertWorkout failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String scheduleWorkout(UUID userId, String garminWorkoutId, LocalDate date) {
        GarminTokens tokens = loadTokens(userId);

        try {
            String url  = TRAINING_API_BASE + "/workout/" + garminWorkoutId + "/schedule";
            String body = "{\"date\":\"" + date + "\"}";
            String responseBody = signedPost(url, tokens, body);
            String scheduleId = extractId(responseBody, "scheduleId");
            log.info("Garmin Training API: scheduled workout id={} on {} userId={}", garminWorkoutId, date, userId);
            return scheduleId;
        } catch (RestClientResponseException e) {
            throw new GarminTrainingException(
                    "Garmin Training API scheduleWorkout failed: HTTP " + e.getStatusCode(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            throw new GarminTrainingException("Garmin Training API scheduleWorkout failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteSchedule(UUID userId, String garminWorkoutId, String garminScheduleId) {
        GarminTokens tokens = loadTokens(userId);
        String url = TRAINING_API_BASE + "/workout/" + garminWorkoutId + "/schedule/" + garminScheduleId;
        try {
            signedDelete(url, tokens);
            log.info("Garmin Training API: deleted schedule id={} userId={}", garminScheduleId, userId);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.warn("Garmin Training API: schedule {} not found (already deleted?)", garminScheduleId);
                return;
            }
            throw new GarminTrainingException(
                    "Garmin Training API deleteSchedule failed: HTTP " + e.getStatusCode(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            throw new GarminTrainingException("Garmin Training API deleteSchedule failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteWorkout(UUID userId, String garminWorkoutId) {
        GarminTokens tokens = loadTokens(userId);
        String url = TRAINING_API_BASE + "/workout/" + garminWorkoutId;
        try {
            signedDelete(url, tokens);
            log.info("Garmin Training API: deleted workout id={} userId={}", garminWorkoutId, userId);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.warn("Garmin Training API: workout {} not found (already deleted?)", garminWorkoutId);
                return;
            }
            throw new GarminTrainingException(
                    "Garmin Training API deleteWorkout failed: HTTP " + e.getStatusCode(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            throw new GarminTrainingException("Garmin Training API deleteWorkout failed: " + e.getMessage(), e);
        }
    }

    // ── OAuth 1.0a signed HTTP helpers ────────────────────────────────────────

    private String signedPost(String url, GarminTokens tokens, String jsonBody) {
        String authHeader = buildOAuthHeader("POST", url, tokens.accessToken(), tokens.accessTokenSecret());
        return restClient.post()
                .uri(url)
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonBody)
                .retrieve()
                .body(String.class);
    }

    private void signedPut(String url, GarminTokens tokens, String jsonBody) {
        String authHeader = buildOAuthHeader("PUT", url, tokens.accessToken(), tokens.accessTokenSecret());
        restClient.put()
                .uri(url)
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonBody)
                .retrieve()
                .toBodilessEntity();
    }

    private void signedDelete(String url, GarminTokens tokens) {
        String authHeader = buildOAuthHeader("DELETE", url, tokens.accessToken(), tokens.accessTokenSecret());
        restClient.delete()
                .uri(url)
                .header("Authorization", authHeader)
                .retrieve()
                .toBodilessEntity();
    }

    // ── OAuth 1.0a signing (same algorithm as GarminOAuthService) ─────────────

    private String buildOAuthHeader(String method, String url,
                                    String oauthToken, String tokenSecret) {
        String nonce     = generateNonce();
        String timestamp = String.valueOf(Instant.now().getEpochSecond());

        Map<String, String> oauthParams = new LinkedHashMap<>();
        oauthParams.put("oauth_consumer_key",     garminProperties.consumerKey());
        oauthParams.put("oauth_nonce",            nonce);
        oauthParams.put("oauth_signature_method", OAUTH_SIGNATURE_METHOD);
        oauthParams.put("oauth_timestamp",        timestamp);
        oauthParams.put("oauth_token",            oauthToken);
        oauthParams.put("oauth_version",          OAUTH_VERSION);

        String normalizedParams = oauthParams.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));

        String signatureBase = method.toUpperCase() + "&" + encode(url) + "&" + encode(normalizedParams);
        String signingKey    = encode(garminProperties.consumerSecret()) + "&" + encode(tokenSecret);
        String signature     = hmacSha1Base64(signatureBase, signingKey);

        return "OAuth oauth_consumer_key=\"" + encode(garminProperties.consumerKey()) + "\","
                + "oauth_nonce=\"" + encode(nonce) + "\","
                + "oauth_signature=\"" + encode(signature) + "\","
                + "oauth_signature_method=\"" + OAUTH_SIGNATURE_METHOD + "\","
                + "oauth_timestamp=\"" + timestamp + "\","
                + "oauth_token=\"" + encode(oauthToken) + "\","
                + "oauth_version=\"" + OAUTH_VERSION + "\"";
    }

    private String hmacSha1Base64(String data, String key) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA1_ALGORITHM);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC_SHA1_ALGORITHM));
            return Base64.getEncoder().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA1 signing failed", e);
        }
    }

    private static String encode(String value) {
        if (value == null) return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20").replace("*", "%2A").replace("%7E", "~");
    }

    private String generateNonce() {
        byte[] bytes = new byte[16];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    // ── Token loading ─────────────────────────────────────────────────────────

    /**
     * Loads and decrypts the user's Garmin OAuth 1.0a access token + secret.
     *
     * <p>Reads from {@code oauth_connections} where {@code provider = 'garmin'}
     * and {@code sync_status != 'disconnected'}.
     *
     * @throws GarminTrainingException if no active connection found
     */
    private GarminTokens loadTokens(UUID userId) {
        record Row(String accessToken, String tokenSecret) {}
        var result = jdbcClient.sql("""
                SELECT access_token, access_token_secret
                  FROM oauth_connections
                 WHERE user_id     = :userId
                   AND provider    = 'garmin'
                   AND sync_status != 'disconnected'
                 LIMIT 1
                """)
                .param("userId", userId)
                .query((rs, n) -> new Row(rs.getString("access_token"), rs.getString("access_token_secret")))
                .optional();

        if (result.isEmpty()) {
            throw new GarminTrainingException(
                    "No active Garmin connection for userId=" + userId + ". User must reconnect Garmin.", 401);
        }

        Row row = result.get();
        return new GarminTokens(
                encryptionUtil.decrypt(row.accessToken()),
                encryptionUtil.decrypt(row.tokenSecret())
        );
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    private String extractId(String jsonBody, String fieldName) {
        try {
            JsonNode node = objectMapper.readTree(jsonBody);
            JsonNode field = node.get(fieldName);
            if (field == null || field.isNull()) {
                throw new GarminTrainingException("Garmin response missing field '" + fieldName + "': " + jsonBody, 0);
            }
            return field.asText();
        } catch (GarminTrainingException e) {
            throw e;
        } catch (Exception e) {
            throw new GarminTrainingException("Failed to parse Garmin Training API response: " + jsonBody, e);
        }
    }

    // ── Private DTO ───────────────────────────────────────────────────────────

    private record GarminTokens(String accessToken, String accessTokenSecret) {}
}
