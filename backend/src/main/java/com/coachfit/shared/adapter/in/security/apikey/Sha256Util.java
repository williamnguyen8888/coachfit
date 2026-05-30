package com.coachfit.shared.adapter.in.security.apikey;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 hashing utility for API key verification.
 *
 * <p>Placed in the {@code shared} security package so that {@link ApiKeyAuthenticationFilter}
 * does not need to import from the {@code apikey} application service layer,
 * preserving Spring Modulith module boundaries.
 *
 * <p>The same algorithm is used in {@code ApiKeyService} — must stay in sync.
 */
final class Sha256Util {

    private Sha256Util() {}

    /** Returns the SHA-256 digest of {@code input} as a lowercase hex string. */
    static String hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
