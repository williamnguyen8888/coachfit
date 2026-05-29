package com.coachfit.gear.adapter.out.persistence;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code gear} table.
 */
@Entity
@Table(name = "gear")
class GearEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "name", nullable = false, length = 255)
    String name;

    @Column(name = "sport", length = 50)
    String sport;

    @Column(name = "type", length = 50)
    String type;    // bike / shoes / wetsuit

    @Column(name = "is_active", nullable = false)
    boolean isActive;

    @Column(name = "total_distance_meters", nullable = false, precision = 12, scale = 2)
    BigDecimal totalDistanceMeters;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    protected GearEntity() {}

    GearEntity(UUID userId, String name, String sport, String type) {
        this.userId              = userId;
        this.name                = name;
        this.sport               = sport;
        this.type                = type;
        this.isActive            = true;
        this.totalDistanceMeters = BigDecimal.ZERO;
        this.createdAt           = Instant.now();
    }
}
