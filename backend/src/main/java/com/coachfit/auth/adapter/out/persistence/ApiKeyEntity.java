package com.coachfit.auth.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code api_keys} table.
 * Raw API key is never stored — only the SHA-256 hex hash and display prefix.
 */
@Entity
@Table(name = "api_keys")
class ApiKeyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "key_hash", nullable = false, unique = true, length = 255)
    String keyHash;     // SHA-256(rawKey) hex

    @Column(name = "key_prefix", nullable = false, length = 10)
    String keyPrefix;   // first 8 chars for display

    @Column(name = "name", length = 100)
    String name;

    @Column(name = "last_used_at")
    Instant lastUsedAt;

    @Column(name = "expires_at")
    Instant expiresAt;

    @Column(name = "is_active", nullable = false)
    boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    protected ApiKeyEntity() {}

    ApiKeyEntity(UUID userId, String keyHash, String keyPrefix, String name, Instant expiresAt) {
        this.userId    = userId;
        this.keyHash   = keyHash;
        this.keyPrefix = keyPrefix;
        this.name      = name;
        this.expiresAt = expiresAt;
        this.isActive  = true;
        this.createdAt = Instant.now();
    }
}
