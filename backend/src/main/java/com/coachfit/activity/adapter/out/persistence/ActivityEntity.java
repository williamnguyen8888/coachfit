package com.coachfit.activity.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity mapping the {@code activities} table.
 */
@Entity
@Table(name = "activities")
class ActivityEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "source", nullable = false, length = 20)
    String source;

    @Column(name = "source_id", length = 255)
    String sourceId;

    @Column(name = "sport", nullable = false, length = 50)
    String sport;

    @Column(name = "sub_sport", length = 50)
    String subSport;

    @Column(name = "name", nullable = false, length = 255)
    String name;

    @Column(name = "description")
    String description;

    @Column(name = "started_at", nullable = false)
    Instant startedAt;

    @Column(name = "duration_seconds", nullable = false)
    Integer durationSeconds;

    @Column(name = "moving_time_seconds")
    Integer movingTimeSeconds;

    @Column(name = "distance_meters", precision = 12, scale = 2)
    BigDecimal distanceMeters;

    @Column(name = "elevation_gain_meters", precision = 8, scale = 2)
    BigDecimal elevationGainMeters;

    @Column(name = "total_descent_meters", precision = 8, scale = 2)
    BigDecimal totalDescentMeters;

    @Column(name = "calories")
    Integer calories;

    @Column(name = "avg_heart_rate")
    Integer avgHeartRate;

    @Column(name = "max_heart_rate")
    Integer maxHeartRate;

    @Column(name = "avg_power")
    Integer avgPower;

    @Column(name = "max_power")
    Integer maxPower;

    @Column(name = "normalized_power")
    Integer normalizedPower;

    @Column(name = "intensity_factor", precision = 4, scale = 3)
    BigDecimal intensityFactor;

    @Column(name = "tss", precision = 8, scale = 2)
    BigDecimal tss;

    @Column(name = "avg_cadence")
    Integer avgCadence;

    @Column(name = "avg_pace", precision = 8, scale = 2)
    BigDecimal avgPace;

    @Column(name = "avg_speed", precision = 8, scale = 4)
    BigDecimal avgSpeed;

    @Column(name = "max_speed", precision = 8, scale = 4)
    BigDecimal maxSpeed;

    @Column(name = "avg_temperature")
    @JdbcTypeCode(SqlTypes.SMALLINT)
    Integer avgTemperature;

    @Column(name = "min_altitude", precision = 8, scale = 2)
    BigDecimal minAltitude;

    @Column(name = "max_altitude", precision = 8, scale = 2)
    BigDecimal maxAltitude;

    @Column(name = "aerobic_training_effect", precision = 3, scale = 1)
    BigDecimal aerobicTrainingEffect;

    @Column(name = "anaerobic_training_effect", precision = 3, scale = 1)
    BigDecimal anaerobicTrainingEffect;

    // Running dynamics
    @Column(name = "avg_vertical_oscillation", precision = 6, scale = 1)
    BigDecimal avgVerticalOscillation;

    @Column(name = "avg_ground_contact_time", precision = 7, scale = 1)
    BigDecimal avgGroundContactTime;

    @Column(name = "avg_step_length", precision = 7, scale = 1)
    BigDecimal avgStepLength;

    @Column(name = "avg_vertical_ratio", precision = 5, scale = 2)
    BigDecimal avgVerticalRatio;

    // Cycling technique
    @Column(name = "left_right_balance", precision = 5, scale = 1)
    BigDecimal leftRightBalance;

    @Column(name = "avg_left_pedal_smoothness", precision = 5, scale = 1)
    BigDecimal avgLeftPedalSmoothness;

    @Column(name = "avg_left_torque_effectiveness", precision = 5, scale = 1)
    BigDecimal avgLeftTorqueEffectiveness;

    // Swimming
    @Column(name = "pool_length", precision = 6, scale = 1)
    BigDecimal poolLength;

    @Column(name = "swim_stroke", length = 20)
    String swimStroke;

    @Column(name = "avg_swolf", precision = 5, scale = 1)
    BigDecimal avgSwolf;

    @Column(name = "start_lat", precision = 10, scale = 7)
    BigDecimal startLat;

    @Column(name = "start_lng", precision = 10, scale = 7)
    BigDecimal startLng;

    @Column(name = "gear_id")
    UUID gearId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "weather", columnDefinition = "jsonb")
    String weather;

    @Column(name = "raw_file_path", length = 512)
    String rawFilePath;

    @Column(name = "raw_file_format", length = 10)
    String rawFileFormat;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra", nullable = false, columnDefinition = "jsonb")
    String extra;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @Column(name = "deleted_at")
    Instant deletedAt;

    protected ActivityEntity() {}

    ActivityEntity(UUID userId, String source, String sourceId, String sport,
                   String name, Instant startedAt, int durationSeconds) {
        this.userId          = userId;
        this.source          = source;
        this.sourceId        = sourceId;
        this.sport           = sport;
        this.name            = name;
        this.startedAt       = startedAt;
        this.durationSeconds = durationSeconds;
        this.extra           = "{}";
        Instant now          = Instant.now();
        this.createdAt       = now;
        this.updatedAt       = now;
    }
}
