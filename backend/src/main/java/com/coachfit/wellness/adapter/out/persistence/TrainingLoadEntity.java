package com.coachfit.wellness.adapter.out.persistence;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity mapping the {@code training_load} table.
 */
@Entity
@Table(name = "training_load")
class TrainingLoadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "date", nullable = false)
    LocalDate date;

    @Column(name = "sport", nullable = false, length = 50)
    String sport;   // 'all' | 'cycling' | 'running' | 'swimming'

    @Column(name = "daily_tss", precision = 8, scale = 2)
    BigDecimal dailyTss;

    @Column(name = "ctl", precision = 8, scale = 2)
    BigDecimal ctl;

    @Column(name = "atl", precision = 8, scale = 2)
    BigDecimal atl;

    @Column(name = "tsb", precision = 8, scale = 2)
    BigDecimal tsb;

    protected TrainingLoadEntity() {}

    TrainingLoadEntity(UUID userId, LocalDate date, String sport) {
        this.userId = userId;
        this.date   = date;
        this.sport  = sport;
    }
}
