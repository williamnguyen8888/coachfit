package com.coachfit.activity.adapter.out.persistence;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code activity_laps} table.
 */
@Entity
@Table(name = "activity_laps")
class ActivityLapEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "activity_id", nullable = false)
    UUID activityId;

    @Column(name = "lap_index", nullable = false)
    short lapIndex;

    @Column(name = "start_time")
    Instant startTime;

    @Column(name = "duration_seconds")
    Integer durationSeconds;

    @Column(name = "distance_meters", precision = 10, scale = 2)
    BigDecimal distanceMeters;

    @Column(name = "avg_heart_rate")
    Integer avgHeartRate;

    @Column(name = "max_heart_rate")
    Integer maxHeartRate;

    @Column(name = "avg_power")
    Integer avgPower;

    @Column(name = "max_power")
    Integer maxPower;

    @Column(name = "avg_cadence")
    Integer avgCadence;

    @Column(name = "avg_pace", precision = 8, scale = 2)
    BigDecimal avgPace;

    @Column(name = "elevation_gain", precision = 8, scale = 2)
    BigDecimal elevationGain;

    protected ActivityLapEntity() {}

    ActivityLapEntity(UUID activityId, short lapIndex) {
        this.activityId = activityId;
        this.lapIndex   = lapIndex;
    }
}
