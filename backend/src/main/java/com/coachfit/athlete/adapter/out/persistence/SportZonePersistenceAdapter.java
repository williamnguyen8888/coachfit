package com.coachfit.athlete.adapter.out.persistence;

import com.coachfit.athlete.application.port.out.SportZonePersistencePort;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.athlete.domain.model.SportZone.ZoneBand;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence adapter for {@code sport_zones}.
 *
 * <p>Reads use the JPA repository with a native window-function query.
 * Upserts use JdbcClient to handle the JSONB {@code zones} column atomically.
 */
@Repository
class SportZonePersistenceAdapter implements SportZonePersistencePort {

    private final SportZoneJpaRepository jpaRepo;
    private final JdbcClient             jdbcClient;
    private final ObjectMapper           objectMapper;

    SportZonePersistenceAdapter(SportZoneJpaRepository jpaRepo,
                                JdbcClient jdbcClient,
                                ObjectMapper objectMapper) {
        this.jpaRepo      = jpaRepo;
        this.jdbcClient   = jdbcClient;
        this.objectMapper = objectMapper;
    }

    // ── SportZonePersistencePort ──────────────────────────────────────────────

    @Override
    public List<SportZone> findLatestByUserId(UUID userId) {
        return jpaRepo.findLatestByUserId(userId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<SportZone> findLatestBySportAndType(UUID userId, String sport, String zoneType) {
        return queryZoneRow(userId, sport, zoneType, null);
    }

    @Override
    public Optional<SportZone> findBySportAndTypeAtDate(UUID userId, String sport, String zoneType,
                                                         LocalDate activityDate) {
        return queryZoneRow(userId, sport, zoneType, activityDate);
    }

    /**
     * Shared query for both latest and at-date lookups.
     *
     * <p>When {@code atDate} is null, returns the most recent row overall.
     * When {@code atDate} is set, returns the most recent row with {@code effective_date ≤ atDate},
     * ensuring historical accuracy for Time-in-Zone and TSS calculations.
     */
    private Optional<SportZone> queryZoneRow(UUID userId, String sport, String zoneType,
                                              LocalDate atDate) {
        String dateCond = atDate != null ? "AND effective_date <= :atDate" : "";
        var stmt = jdbcClient.sql("""
                SELECT id, user_id, sport, zone_type, ftp, lthr, max_hr,
                       threshold_pace, css, zones, effective_date, created_at
                  FROM sport_zones
                 WHERE user_id   = :userId
                   AND sport     = :sport
                   AND zone_type = :zoneType
                """ + dateCond + """
                 ORDER BY effective_date DESC, created_at DESC
                 LIMIT 1
                """)
                .param("userId",   userId)
                .param("sport",    sport)
                .param("zoneType", zoneType);
        if (atDate != null) {
            stmt = stmt.param("atDate", atDate);
        }
        return stmt
                .query((rs, rowNum) -> mapToEntity(rs))
                .optional()
                .map(this::toDomain);
    }


    @Override
    @Transactional
    public SportZone upsert(SportZone zone) {
        String zonesJson = serializeZones(zone.zones());

        jdbcClient.sql("""
                INSERT INTO sport_zones
                    (id, user_id, sport, zone_type, ftp, lthr, max_hr,
                     threshold_pace, css, zones, effective_date, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :sport, :zoneType,
                     :ftp, :lthr, :maxHr, :thresholdPace, :css,
                     :zones::jsonb, :effectiveDate, now())
                ON CONFLICT (user_id, sport, zone_type, effective_date) DO UPDATE SET
                    ftp            = EXCLUDED.ftp,
                    lthr           = EXCLUDED.lthr,
                    max_hr         = EXCLUDED.max_hr,
                    threshold_pace = EXCLUDED.threshold_pace,
                    css            = EXCLUDED.css,
                    zones          = EXCLUDED.zones
                """)
                .param("userId",        zone.userId())
                .param("sport",         zone.sport())
                .param("zoneType",      zone.zoneType())
                .param("ftp",           zone.ftp())
                .param("lthr",          zone.lthr())
                .param("maxHr",         zone.maxHr())
                .param("thresholdPace", zone.thresholdPace())
                .param("css",           zone.css())
                .param("zones",         zonesJson)
                .param("effectiveDate", zone.effectiveDate())
                .update();

        // Reload the just-upserted row
        return jpaRepo.findLatestByUserId(zone.userId()).stream()
                .filter(e -> e.sport.equals(zone.sport()) && e.zoneType.equals(zone.zoneType()))
                .findFirst()
                .map(this::toDomain)
                .orElseThrow(() -> new IllegalStateException(
                        "Sport zone not found after upsert for userId=" + zone.userId()));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private SportZoneEntity mapToEntity(java.sql.ResultSet rs) throws java.sql.SQLException {
        SportZoneEntity e = new SportZoneEntity();
        e.id            = (UUID) rs.getObject("id");
        e.userId        = (UUID) rs.getObject("user_id");
        e.sport         = rs.getString("sport");
        e.zoneType      = rs.getString("zone_type");
        e.ftp           = rs.getObject("ftp",            Integer.class);
        e.lthr          = rs.getObject("lthr",           Integer.class);
        e.maxHr         = rs.getObject("max_hr",         Integer.class);
        e.thresholdPace = rs.getObject("threshold_pace", Integer.class);
        e.css           = rs.getObject("css",            Integer.class);
        e.zonesJson     = rs.getString("zones");
        e.effectiveDate = rs.getObject("effective_date", LocalDate.class);
        e.createdAt     = rs.getTimestamp("created_at").toInstant();
        return e;
    }

    private SportZone toDomain(SportZoneEntity e) {
        List<ZoneBand> bands = deserializeZones(e.zonesJson);
        return new SportZone(
                e.id,
                e.userId,
                e.sport,
                e.zoneType,
                e.ftp,
                e.lthr,
                e.maxHr,
                e.thresholdPace,
                e.css,
                bands,
                e.effectiveDate,
                e.createdAt
        );
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    private String serializeZones(List<ZoneBand> zones) {
        try {
            return objectMapper.writeValueAsString(zones);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize zones", e);
        }
    }

    private List<ZoneBand> deserializeZones(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<ZoneBand>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize zones JSON", e);
        }
    }
}
