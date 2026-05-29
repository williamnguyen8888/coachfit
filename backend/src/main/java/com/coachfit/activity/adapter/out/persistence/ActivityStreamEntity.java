package com.coachfit.activity.adapter.out.persistence;

import jakarta.persistence.*;

import java.util.UUID;

/**
 * JPA entity mapping the {@code activity_streams} table.
 * Arrays are stored as native PostgreSQL array types via {@code columnDefinition}.
 */
@Entity
@Table(name = "activity_streams")
class ActivityStreamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "activity_id", nullable = false, unique = true)
    UUID activityId;

    @Column(name = "timestamps", columnDefinition = "integer[]")
    int[] timestamps;

    @Column(name = "heart_rate", columnDefinition = "smallint[]")
    short[] heartRate;

    @Column(name = "power", columnDefinition = "smallint[]")
    short[] power;

    @Column(name = "cadence", columnDefinition = "smallint[]")
    short[] cadence;

    @Column(name = "speed", columnDefinition = "real[]")
    float[] speed;

    @Column(name = "altitude", columnDefinition = "real[]")
    float[] altitude;

    @Column(name = "latitude", columnDefinition = "double precision[]")
    double[] latitude;

    @Column(name = "longitude", columnDefinition = "double precision[]")
    double[] longitude;

    @Column(name = "distance", columnDefinition = "real[]")
    float[] distance;

    @Column(name = "temperature", columnDefinition = "smallint[]")
    short[] temperature;

    @Column(name = "grade", columnDefinition = "real[]")
    float[] grade;

    protected ActivityStreamEntity() {}

    ActivityStreamEntity(UUID activityId) {
        this.activityId = activityId;
    }
}
