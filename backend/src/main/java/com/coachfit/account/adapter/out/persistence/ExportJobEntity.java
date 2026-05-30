package com.coachfit.account.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code export_jobs} table (V023 migration).
 */
@Entity
@Table(name = "export_jobs")
class ExportJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    UUID userId;

    @Column(name = "status", nullable = false, length = 20)
    String status;

    @Column(name = "file_url", length = 1024)
    String fileUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "expires_at")
    Instant expiresAt;

    protected ExportJobEntity() {}

    ExportJobEntity(UUID userId) {
        this.userId    = userId;
        this.status    = "PENDING";
        this.createdAt = Instant.now();
    }
}
