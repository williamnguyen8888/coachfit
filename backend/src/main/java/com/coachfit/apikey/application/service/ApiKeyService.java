package com.coachfit.apikey.application.service;

import com.coachfit.apikey.application.port.in.ApiKeyUseCase;
import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort;
import com.coachfit.apikey.application.port.out.ApiKeyPersistencePort.ApiKeyRow;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link ApiKeyUseCase}.
 *
 * <h3>Key lifecycle (docs/08-auth-model.md §API Key Authentication)</h3>
 * <ol>
 *   <li>Generate: {@code cf_live_} + 32-char secure random hex</li>
 *   <li>Hash: SHA-256(rawKey) → hex string stored as {@code key_hash}</li>
 *   <li>Prefix: first 8 chars of raw key stored as {@code key_prefix} for display</li>
 *   <li>Raw key returned once in {@link CreatedKey} and NEVER stored or logged</li>
 * </ol>
 */
@Service
public class ApiKeyService implements ApiKeyUseCase {

    private static final String KEY_PREFIX  = "cf_live_";
    private static final int    HEX_BYTES   = 16;    // 16 bytes = 32 hex chars

    private final ApiKeyPersistencePort persistence;
    private final SecureRandom          secureRandom = new SecureRandom();

    public ApiKeyService(ApiKeyPersistencePort persistence) {
        this.persistence = persistence;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Override
    public List<ApiKeyInfo> listKeys(UUID userId) {
        return persistence.findAllByUserId(userId).stream()
                .map(this::toInfo)
                .toList();
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Override
    public CreatedKey createKey(UUID userId, String name, Instant expiresAt) {
        String rawKey   = generateRawKey();
        String keyHash  = sha256Hex(rawKey);
        String prefix   = rawKey.substring(0, 8);   // "cf_live_"

        UUID id = persistence.save(userId, keyHash, prefix, name, expiresAt);
        Instant createdAt = persistence.findAllByUserId(userId).stream()
                .filter(k -> k.id().equals(id))
                .findFirst()
                .map(ApiKeyRow::createdAt)
                .orElse(Instant.now());

        // rawKey included ONCE — not stored, not logged
        return new CreatedKey(id, name, prefix, rawKey, expiresAt, createdAt);
    }

    // ── Revoke ───────────────────────────────────────────────────────────────

    @Override
    public void revokeKey(UUID userId, UUID keyId) {
        persistence.findAllByUserId(userId).stream()
                .filter(k -> k.id().equals(keyId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "API key not found."));
        persistence.revoke(keyId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateRawKey() {
        byte[] bytes = new byte[HEX_BYTES];
        secureRandom.nextBytes(bytes);
        return KEY_PREFIX + HexFormat.of().formatHex(bytes);
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private ApiKeyInfo toInfo(ApiKeyRow row) {
        return new ApiKeyInfo(row.id(), row.name(), row.keyPrefix(),
                row.isActive(), row.lastUsedAt(), row.expiresAt(), row.createdAt());
    }
}
