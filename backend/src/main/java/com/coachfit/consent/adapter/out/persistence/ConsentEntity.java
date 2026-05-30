package com.coachfit.consent.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code consents} table (V021 migration).
 */
@Entity
@Table(name = "consents")
class ConsentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    UUID userId;

    @Column(name = "type", nullable = false, length = 80)
    String type;

    @Column(name = "granted", nullable = false)
    boolean granted;

    @Column(name = "granted_at", nullable = false, updatable = false)
    Instant grantedAt;

    @Column(name = "ip_address", length = 45)
    String ipAddress;

    @Column(name = "user_agent", length = 512)
    String userAgent;

    @Column(name = "version", length = 20)
    String version;

    protected ConsentEntity() {}

    ConsentEntity(UUID userId, String type, boolean granted,
                  String ipAddress, String userAgent, String version) {
        this.userId    = userId;
        this.type      = type;
        this.granted   = granted;
        this.grantedAt = Instant.now();
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.version   = version;
    }
}
