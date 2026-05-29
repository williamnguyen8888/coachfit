package com.coachfit.athlete.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity for the {@code athlete_profiles} table.
 *
 * <p>The {@code sports TEXT[]} column is mapped via {@code SqlTypes.ARRAY} (Hibernate 6
 * built-in) as a {@code String[]}. All upserts go through JdbcClient to handle the
 * native PostgreSQL array literal cleanly — same pattern as
 * {@code OAuthConnectionPersistenceAdapter}.
 */
@Entity
@Table(name = "athlete_profiles")
class AthleteProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    UUID userId;

    @Column(name = "date_of_birth")
    LocalDate dateOfBirth;

    @Column(name = "gender", length = 10)
    String gender;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    BigDecimal weightKg;

    @Column(name = "height_cm", precision = 5, scale = 1)
    BigDecimal heightCm;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "sports", columnDefinition = "text[]", nullable = false)
    String[] sports;

    @Column(name = "experience_level", length = 20)
    String experienceLevel;

    @Column(name = "primary_sport", length = 50)
    String primarySport;

    @Column(name = "primary_health_source", length = 20)
    String primaryHealthSource;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected AthleteProfileEntity() {}
}
