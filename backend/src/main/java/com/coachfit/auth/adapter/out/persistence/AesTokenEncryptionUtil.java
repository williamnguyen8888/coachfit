package com.coachfit.auth.adapter.out.persistence;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption utility for OAuth tokens stored in the database.
 *
 * <p>docs/08-auth-model.md §Security Checklist:
 * "OAuth tokens — AES-256-GCM encrypted in DB. Key in env var {@code OAUTH_ENCRYPTION_KEY}."
 *
 * <h3>Format</h3>
 * Ciphertext is stored as: {@code Base64(12-byte IV || ciphertext || 16-byte GCM tag)}.
 * The IV is randomly generated per encryption — never reused.
 *
 * <h3>Key derivation</h3>
 * The configured string is hashed with SHA-256 to produce a stable 32-byte key,
 * allowing any-length passphrase without padding/truncation issues.
 */
@Component
public class AesTokenEncryptionUtil {

    private static final String ALGORITHM     = "AES/GCM/NoPadding";
    private static final int    IV_BYTES      = 12;
    private static final int    TAG_BITS      = 128;

    private final SecretKeySpec secretKey;
    private final SecureRandom  secureRandom  = new SecureRandom();

    AesTokenEncryptionUtil(@Value("${app.security.oauth-encryption-key}") String rawKey) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes   = sha.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            this.secretKey    = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialise AES key", e);
        }
    }

    /**
     * Encrypts {@code plaintext} and returns a Base64 string safe for DB storage.
     * Returns {@code null} if {@code plaintext} is {@code null}.
     */
    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv      = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher  = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext
            byte[] combined = new byte[IV_BYTES + ciphertext.length];
            System.arraycopy(iv,         0, combined, 0,         IV_BYTES);
            System.arraycopy(ciphertext, 0, combined, IV_BYTES, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("AES encryption failed", e);
        }
    }

    /**
     * Decrypts a Base64-encoded ciphertext produced by {@link #encrypt}.
     * Returns {@code null} if {@code encoded} is {@code null}.
     */
    public String decrypt(String encoded) {
        if (encoded == null) return null;
        try {
            byte[] combined  = Base64.getDecoder().decode(encoded);
            byte[] iv        = new byte[IV_BYTES];
            byte[] ciphertext = new byte[combined.length - IV_BYTES];
            System.arraycopy(combined, 0,         iv,         0, IV_BYTES);
            System.arraycopy(combined, IV_BYTES, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("AES decryption failed", e);
        }
    }
}
