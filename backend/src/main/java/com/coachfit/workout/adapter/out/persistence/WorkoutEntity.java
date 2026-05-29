package com.coachfit.workout.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code workouts} table.
 */
@Entity
@Table(name = "workouts")
class WorkoutEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id")   // nullable = system template
    UUID userId;

    @Column(name = "name", nullable = false, length = 255)
    String name;

    @Column(name = "sport", nullable = false, length = 50)
    String sport;

    @Column(name = "description")
    String description;

    @Column(name = "estimated_duration_seconds")
    Integer estimatedDurationSeconds;

    @Column(name = "estimated_tss", precision = 6, scale = 2)
    BigDecimal estimatedTss;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "steps", nullable = false, columnDefinition = "jsonb")
    String steps;

    @Column(name = "tags", columnDefinition = "text[]")
    String[] tags;

    @Column(name = "is_template", nullable = false)
    boolean isTemplate;

    @Column(name = "is_public", nullable = false)
    boolean isPublic;

    @Column(name = "source", nullable = false, length = 20)
    String source;   // user / system / coach / import

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @Column(name = "deleted_at")
    Instant deletedAt;

    protected WorkoutEntity() {}

    WorkoutEntity(UUID userId, String name, String sport, String steps) {
        this.userId    = userId;
        this.name      = name;
        this.sport     = sport;
        this.steps     = steps;
        this.isTemplate = false;
        this.isPublic   = false;
        this.source     = "user";
        Instant now     = Instant.now();
        this.createdAt  = now;
        this.updatedAt  = now;
    }
}
