package com.coachfit.wellness.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity mapping the {@code wellness_logs} table.
 */
@Entity
@Table(name = "wellness_logs")
class WellnessLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "date", nullable = false)
    LocalDate date;

    @Column(name = "source", nullable = false, length = 20)
    String source;   // manual / garmin / coros / polar

    @Column(name = "mood")
    Short mood;

    @Column(name = "rpe")
    Short rpe;

    @Column(name = "sleep_quality")
    Short sleepQuality;

    @Column(name = "sleep_hours", precision = 3, scale = 1)
    BigDecimal sleepHours;

    @Column(name = "fatigue")
    Short fatigue;

    @Column(name = "soreness")
    Short soreness;

    @Column(name = "stress_level")
    Short stressLevel;

    @Column(name = "resting_hr")
    Integer restingHr;

    @Column(name = "hrv", precision = 6, scale = 2)
    BigDecimal hrv;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    BigDecimal weightKg;

    @Column(name = "notes")
    String notes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "field_sources", nullable = false, columnDefinition = "jsonb")
    String fieldSources;

    protected WellnessLogEntity() {}

    WellnessLogEntity(UUID userId, LocalDate date, String source) {
        this.userId       = userId;
        this.date         = date;
        this.source       = source;
        this.fieldSources = "{}";
    }
}
