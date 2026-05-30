package com.coachfit.sync.adapter.in;

import com.coachfit.auth.adapter.in.GarminOAuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Verifies Garmin Health API webhook request signatures.
 *
 * <h3>Garmin Signature Protocol</h3>
 * <p>Garmin signs every push request with HMAC-SHA1 using the Consumer Secret
 * as the signing key. The signature is Base64-encoded and sent in the
 * {@code X-Garmin-Signature} HTTP header.
 *
 * <p>Signing input = the raw request body bytes (UTF-8).
 * Signing key     = Consumer Secret (from {@code app.providers.garmin.consumer-secret}).
 *
 * <h3>Verification Steps</h3>
 * <ol>
 *   <li>Read raw request body as UTF-8 bytes.</li>
 *   <li>Compute {@code HMAC-SHA1(consumerSecret, requestBody)}.</li>
 *   <li>Base64-encode the result.</li>
 *   <li>Compare with the value in {@code X-Garmin-Signature} header (constant-time).</li>
 * </ol>
 *
 * <h3>Security Fallback</h3>
 * <p>If the {@code GARMIN_SIGNATURE_REQUIRED} environment variable is set to {@code false}
 * (useful for local development and testing), signature verification is skipped with a
 * warning. In production this must always be {@code true}.
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Push Callback Verification.
 */
@Component
public class GarminSignatureVerifier {

    private static final Logger log = LoggerFactory.getLogger(GarminSignatureVerifier.class);

    private static final String HMAC_ALGO      = "HmacSHA1";
    private static final String SIGNATURE_HDR  = "X-Garmin-Signature";

    private final String  consumerSecret;
    private final boolean signatureRequired;

    GarminSignatureVerifier(GarminOAuthProperties properties,
                            @org.springframework.beans.factory.annotation.Value(
                                    "${app.providers.garmin.signature-required:true}") boolean signatureRequired) {
        this.consumerSecret   = properties.consumerSecret();
        this.signatureRequired = signatureRequired;

        if (!signatureRequired) {
            log.warn("⚠️  GARMIN SIGNATURE VERIFICATION IS DISABLED (app.providers.garmin.signature-required=false). " +
                    "This must be enabled in production!");
        }
    }

    /**
     * Verifies the Garmin webhook signature.
     *
     * @param rawBody           raw request body bytes (must be read before Jackson parsing)
     * @param signatureHeader   value of {@code X-Garmin-Signature} header (null if absent)
     * @return {@code true} if the signature is valid (or verification is disabled in dev mode)
     */
    public boolean verify(byte[] rawBody, String signatureHeader) {
        if (!signatureRequired) {
            log.debug("Garmin signature check skipped (disabled in config)");
            return true;
        }

        if (signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("Garmin webhook received without X-Garmin-Signature header — rejecting");
            return false;
        }

        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(
                    consumerSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] computed = mac.doFinal(rawBody);
            String computedB64 = Base64.getEncoder().encodeToString(computed);

            // Constant-time comparison to prevent timing attacks
            boolean valid = constantTimeEquals(computedB64, signatureHeader.trim());
            if (!valid) {
                log.warn("Garmin webhook signature mismatch — possible tampered request. " +
                        "Expected={} Received={}", computedB64, signatureHeader.trim());
            }
            return valid;

        } catch (Exception e) {
            log.error("Garmin signature verification error: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Constant-time string comparison to prevent timing side-channel attacks.
     * Returns {@code false} if lengths differ (leaks length, but that's acceptable for Base64).
     */
    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    /** Returns the expected header name for use in controller filtering. */
    public static String signatureHeaderName() {
        return SIGNATURE_HDR;
    }
}
