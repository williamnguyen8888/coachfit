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
        return jdbcClient.sql("""
                SELECT * FROM sport_zones
                 WHERE user_id   = :userId
                   AND sport     = :sport
                   AND zone_type = :zoneType
                 ORDER BY effective_date DESC, created_at DESC
                 LIMIT 1
                """)
                .param("userId",   userId)
                .param("sport",    sport)
                .param("zoneType", zoneType)
                .query((rs, rowNum) -> {
                    SportZoneEntity e = new SportZoneEntity();
                    e.id            = (UUID) rs.getObject("id");
                    e.userId        = (UUID) rs.getObject("user_id");
                    e.sport         = rs.getString("sport");
                    e.zoneType      = rs.getString("zone_type");
                    e.ftp           = rs.getObject("ftp",    Integer.class);
                    e.lthr          = rs.getObject("lthr",   Integer.class);
                    e.maxHr         = rs.getObject("max_hr", Integer.class);
                    e.zonesJson     = rs.getString("zones");
                    e.effectiveDate = rs.getObject("effective_date", java.time.LocalDate.class);
                    e.createdAt     = rs.getTimestamp("created_at").toInstant();
                    return e;
                })
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
                     zones, effective_date, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :sport, :zoneType,
                     :ftp, :lthr, :maxHr, :zones::jsonb, :effectiveDate, now())
                ON CONFLICT (user_id, sport, zone_type, effective_date) DO UPDATE SET
                    ftp            = EXCLUDED.ftp,
                    lthr           = EXCLUDED.lthr,
                    max_hr         = EXCLUDED.max_hr,
                    zones          = EXCLUDED.zones
                """)
                .param("userId",        zone.userId())
                .param("sport",         zone.sport())
                .param("zoneType",      zone.zoneType())
                .param("ftp",           zone.ftp())
                .param("lthr",          zone.lthr())
                .param("maxHr",         zone.maxHr())
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
