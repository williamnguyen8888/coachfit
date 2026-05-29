package com.coachfit.auth.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code users} table.
 * Only the columns needed by the auth module are mapped here.
 */
@Entity
@Table(name = "users")
class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    String email;

    @Column(name = "password_hash", length = 255)
    String passwordHash;

    @Column(name = "full_name", nullable = false, length = 255)
    String fullName;

    @Column(name = "avatar_url", length = 512)
    String avatarUrl;

    @Column(name = "role", nullable = false, length = 20)
    String role;

    @Column(name = "onboarding_completed", nullable = false)
    boolean onboardingCompleted;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", nullable = false, columnDefinition = "jsonb")
    String settings;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @Column(name = "deleted_at")
    Instant deletedAt;

    protected UserEntity() {}

    UserEntity(String email, String fullName, String passwordHash) {
        this.email             = email;
        this.fullName          = fullName;
        this.passwordHash      = passwordHash;
        this.role              = "athlete";
        this.onboardingCompleted = false;
        this.settings          = "{}";
        Instant now            = Instant.now();
        this.createdAt         = now;
        this.updatedAt         = now;
    }
}
