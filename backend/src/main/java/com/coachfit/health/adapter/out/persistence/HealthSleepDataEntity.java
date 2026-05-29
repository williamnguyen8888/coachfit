package com.coachfit.health.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity mapping the {@code health_sleep_data} table.
 */
@Entity
@Table(name = "health_sleep_data")
class HealthSleepDataEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "date", nullable = false)
    LocalDate date;   // wakeup date

    @Column(name = "source", nullable = false, length = 20)
    String source;

    @Column(name = "sleep_start")
    Instant sleepStart;

    @Column(name = "sleep_end")
    Instant sleepEnd;

    @Column(name = "duration_seconds")
    Integer durationSeconds;

    @Column(name = "deep_seconds")
    Integer deepSeconds;

    @Column(name = "light_seconds")
    Integer lightSeconds;

    @Column(name = "rem_seconds")
    Integer remSeconds;

    @Column(name = "awake_seconds")
    Integer awakeSeconds;

    @Column(name = "sleep_score")
    Integer sleepScore;

    @Column(name = "avg_respiration", precision = 4, scale = 1)
    BigDecimal avgRespiration;

    @Column(name = "avg_spo2", precision = 4, scale = 1)
    BigDecimal avgSpo2;

    @Column(name = "avg_hrv", precision = 6, scale = 2)
    BigDecimal avgHrv;

    @Column(name = "hrv_status", length = 20)
    String hrvStatus;   // balanced / low / unbalanced

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra", nullable = false, columnDefinition = "jsonb")
    String extra;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    String rawPayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    protected HealthSleepDataEntity() {}

    HealthSleepDataEntity(UUID userId, LocalDate date, String source) {
        this.userId    = userId;
        this.date      = date;
        this.source    = source;
        this.extra     = "{}";
        this.createdAt = Instant.now();
    }
}
