package com.coachfit.athlete.adapter.out.persistence;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity for the {@code sport_zones} table.
 *
 * <p>The {@code zones JSONB} column is stored as a raw JSON string
 * ({@code SqlTypes.JSON}) and parsed to/from {@link com.coachfit.athlete.domain.model.SportZone.ZoneBand}
 * list by the adapter using Jackson.
 */
@Entity
@Table(name = "sport_zones")
class SportZoneEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    UUID userId;

    @Column(name = "sport", nullable = false, length = 50)
    String sport;

    @Column(name = "zone_type", nullable = false, length = 20)
    String zoneType;

    @Column(name = "ftp")
    Integer ftp;

    @Column(name = "lthr")
    Integer lthr;

    @Column(name = "max_hr")
    Integer maxHr;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "zones", nullable = false, columnDefinition = "jsonb")
    String zonesJson;  // raw JSON: [{zone:1,name:"Recovery",min:0,max:55},...]

    @Column(name = "effective_date", nullable = false)
    LocalDate effectiveDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    protected SportZoneEntity() {}
}
