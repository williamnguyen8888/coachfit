package com.coachfit.health.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity mapping the {@code health_daily_summaries} table.
 */
@Entity
@Table(name = "health_daily_summaries")
class HealthDailySummaryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "date", nullable = false)
    LocalDate date;

    @Column(name = "source", nullable = false, length = 20)
    String source;

    @Column(name = "steps")
    Integer steps;

    @Column(name = "distance_meters", precision = 10, scale = 2)
    BigDecimal distanceMeters;

    @Column(name = "calories_total")
    Integer caloriesTotal;

    @Column(name = "calories_active")
    Integer caloriesActive;

    @Column(name = "active_minutes")
    Integer activeMinutes;

    @Column(name = "intensity_minutes")
    Integer intensityMinutes;

    @Column(name = "floors_climbed")
    Integer floorsClimbed;

    @Column(name = "resting_hr")
    Integer restingHr;

    @Column(name = "avg_hr")
    Integer avgHr;

    @Column(name = "max_hr")
    Integer maxHr;

    @Column(name = "avg_stress")
    Integer avgStress;

    @Column(name = "max_stress")
    Integer maxStress;

    @Column(name = "body_battery_high")
    Integer bodyBatteryHigh;

    @Column(name = "body_battery_low")
    Integer bodyBatteryLow;

    @Column(name = "avg_spo2", precision = 4, scale = 1)
    BigDecimal avgSpo2;

    @Column(name = "avg_respiration", precision = 4, scale = 1)
    BigDecimal avgRespiration;

    @Column(name = "vo2max", precision = 4, scale = 1)
    BigDecimal vo2max;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra", nullable = false, columnDefinition = "jsonb")
    String extra;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    String rawPayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    protected HealthDailySummaryEntity() {}

    HealthDailySummaryEntity(UUID userId, LocalDate date, String source) {
        this.userId    = userId;
        this.date      = date;
        this.source    = source;
        this.extra     = "{}";
        this.createdAt = Instant.now();
    }
}
