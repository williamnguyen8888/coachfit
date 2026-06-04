package com.coachfit.activity.adapter.out.persistence;

import com.coachfit.activity.application.port.in.GetActivityUseCase.ActivityDetail;
import com.coachfit.activity.application.port.in.GetActivityUseCase.GearRef;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase.ActivityListItem;
import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.domain.model.ParsedActivity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link ActivityPersistencePort}.
 *
 * <p>JPA is used for inserts (via {@link ActivityEntity}).
 * JdbcClient handles the dedup check, soft-delete, and findById to avoid
 * pulling the full entity on hot paths.
 */
@Repository
class ActivityPersistenceAdapter implements ActivityPersistencePort {

    private final ActivityJpaRepository repo;
    private final JdbcClient            jdbcClient;

    ActivityPersistenceAdapter(ActivityJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    // ── Manual upload path ────────────────────────────────────────────────────

    @Override
    public Optional<UUID> findDuplicate(UUID userId, Instant startedAt, String sport, int durationSeconds) {
        return jdbcClient.sql("""
                SELECT id FROM activities
                WHERE user_id = :userId
                  AND sport   = :sport
                  AND started_at BETWEEN :from AND :to
                  AND ABS(duration_seconds - :duration) < 60
                  AND deleted_at IS NULL
                LIMIT 1
                """)
                .param("userId",   userId)
                .param("sport",    sport)
                .param("from",     java.sql.Timestamp.from(startedAt.minusSeconds(60)))
                .param("to",       java.sql.Timestamp.from(startedAt.plusSeconds(60)))
                .param("duration", durationSeconds)
                .query(UUID.class)
                .optional();
    }

    @Override
    @Transactional
    public UUID saveActivity(UUID userId, ParsedActivity parsed, String rawFilePath, String rawFileFormat) {
        ActivityEntity e = new ActivityEntity(userId, "manual", null,
                parsed.sport(), parsed.name(), parsed.startedAt(), parsed.durationSeconds());

        e.subSport            = parsed.subSport();
        e.movingTimeSeconds   = parsed.movingTimeSeconds();
        e.distanceMeters      = parsed.distanceMeters();
        e.elevationGainMeters = parsed.elevationGainMeters();
        e.calories            = parsed.calories();
        e.avgHeartRate        = parsed.avgHeartRate();
        e.maxHeartRate        = parsed.maxHeartRate();
        e.avgPower            = parsed.avgPower();
        e.maxPower            = parsed.maxPower();
        e.normalizedPower     = parsed.normalizedPower();
        e.intensityFactor     = parsed.intensityFactor();
        e.tss                 = parsed.tss();
        e.avgCadence          = parsed.avgCadence();
        e.avgSpeed            = parsed.avgSpeed();
        e.startLat            = parsed.startLat() != null
                ? BigDecimal.valueOf(parsed.startLat()).setScale(7, RoundingMode.HALF_UP) : null;
        e.startLng            = parsed.startLng() != null
                ? BigDecimal.valueOf(parsed.startLng()).setScale(7, RoundingMode.HALF_UP) : null;
        e.rawFilePath         = rawFilePath;
        e.rawFileFormat       = rawFileFormat;

        return repo.save(e).id;
    }

    @Override
    public ActivitySummary findById(UUID activityId) {
        return repo.findById(activityId)
                .filter(e -> e.deletedAt == null)
                .map(e -> new ActivitySummary(
                        e.id, e.name, e.sport, e.startedAt,
                        e.durationSeconds,
                        e.distanceMeters != null ? e.distanceMeters.doubleValue() : null,
                        e.source, e.rawFileFormat))
                .orElseThrow(() -> new IllegalStateException("Activity not found after save: " + activityId));
    }

    // ── Shared paths ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID save(UUID userId,
                     String source,
                     String sourceId,
                     String sport,
                     String subSport,
                     String name,
                     Instant startedAt,
                     int durationSeconds,
                     BigDecimal distanceMeters,
                     BigDecimal elevationGainMeters) {

        ActivityEntity entity = new ActivityEntity(userId, source, sourceId, sport, name,
                startedAt, durationSeconds);
        entity.subSport            = subSport;
        entity.distanceMeters      = distanceMeters;
        entity.elevationGainMeters = elevationGainMeters;
        return repo.save(entity).id;
    }

    @Override
    public boolean existsByUserSourceAndSourceId(UUID userId, String source, String sourceId) {
        return jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM activities
                    WHERE user_id   = :userId
                      AND source    = :source
                      AND source_id = :sourceId
                      AND deleted_at IS NULL
                )
                """)
                .param("userId",   userId)
                .param("source",   source)
                .param("sourceId", sourceId)
                .query(Boolean.class)
                .single();
    }

    @Override
    public Optional<UUID> findIdByUserSourceAndSourceId(UUID userId, String source, String sourceId) {
        return jdbcClient.sql("""
                SELECT id FROM activities
                WHERE user_id   = :userId
                  AND source    = :source
                  AND source_id = :sourceId
                  AND deleted_at IS NULL
                LIMIT 1
                """)
                .param("userId",   userId)
                .param("source",   source)
                .param("sourceId", sourceId)
                .query(UUID.class)
                .optional();
    }

    @Override
    @Transactional
    public void updateFromStrava(UUID activityId, String name, String description,
                                 Integer avgHeartRate, Integer maxHeartRate,
                                 Integer avgPower, Integer maxPower, Integer normalizedPower,
                                 java.math.BigDecimal tss, java.math.BigDecimal intensityFactor,
                                 Integer avgCadence, java.math.BigDecimal distanceMeters,
                                 Integer calories, java.math.BigDecimal elevationGainMeters) {
        jdbcClient.sql("""
                UPDATE activities SET
                    name                  = COALESCE(:name, name),
                    description           = COALESCE(:description, description),
                    avg_heart_rate        = COALESCE(:avgHeartRate, avg_heart_rate),
                    max_heart_rate        = COALESCE(:maxHeartRate, max_heart_rate),
                    avg_power             = COALESCE(:avgPower, avg_power),
                    max_power             = COALESCE(:maxPower, max_power),
                    normalized_power      = COALESCE(:normalizedPower, normalized_power),
                    tss                   = COALESCE(:tss, tss),
                    intensity_factor      = COALESCE(:intensityFactor, intensity_factor),
                    avg_cadence           = COALESCE(:avgCadence, avg_cadence),
                    distance_meters       = COALESCE(:distanceMeters, distance_meters),
                    calories              = COALESCE(:calories, calories),
                    elevation_gain_meters = COALESCE(:elevationGainMeters, elevation_gain_meters),
                    updated_at            = now()
                WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id",                activityId)
                .param("name",              name)
                .param("description",       description)
                .param("avgHeartRate",      avgHeartRate)
                .param("maxHeartRate",      maxHeartRate)
                .param("avgPower",          avgPower)
                .param("maxPower",          maxPower)
                .param("normalizedPower",   normalizedPower)
                .param("tss",               tss)
                .param("intensityFactor",   intensityFactor)
                .param("avgCadence",        avgCadence)
                .param("distanceMeters",    distanceMeters)
                .param("calories",          calories)
                .param("elevationGainMeters", elevationGainMeters)
                .update();
    }

    @Override
    @Transactional
    public void softDelete(UUID activityId) {
        jdbcClient.sql("""
                UPDATE activities
                   SET deleted_at = now(), updated_at = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", activityId)
                .update();
    }

    // ── Read API ──────────────────────────────────────────────────────────────

    /** Allowlisted sort columns to prevent SQL injection from user-supplied sort params. */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "startedAt", "durationSeconds", "distanceMeters", "tss", "createdAt"
    );

    private static String toColumnName(String sortField) {
        return switch (sortField) {
            case "startedAt"       -> "started_at";
            case "durationSeconds" -> "duration_seconds";
            case "distanceMeters"  -> "distance_meters";
            case "tss"             -> "tss";
            case "createdAt"       -> "created_at";
            default                -> "started_at";  // safe fallback
        };
    }

    @Override
    public List<ActivityListItem> list(UUID userId, String sport, String source,
                                       Instant from, Instant to,
                                       int page, int size,
                                       String sortField, String sortDir) {

        String col = toColumnName(
                ALLOWED_SORT_FIELDS.contains(sortField) ? sortField : "startedAt");
        String dir = "asc".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";

        // Build dynamic WHERE clause
        StringBuilder sql = new StringBuilder("""
                SELECT id, sport, name, started_at, duration_seconds,
                       distance_meters, avg_heart_rate, avg_power, tss, source
                  FROM activities
                 WHERE user_id = :userId
                   AND deleted_at IS NULL
                """);
        if (sport  != null) sql.append("  AND sport  = :sport\n");
        if (source != null) sql.append("  AND source = :source\n");
        if (from   != null) sql.append("  AND started_at >= :from\n");
        if (to     != null) sql.append("  AND started_at <= :to\n");
        sql.append(" ORDER BY ").append(col).append(" ").append(dir).append("\n");
        sql.append(" LIMIT :size OFFSET :offset");

        var stmt = jdbcClient.sql(sql.toString())
                .param("userId", userId)
                .param("size",   size)
                .param("offset", (long) page * size);
        if (sport  != null) stmt = stmt.param("sport",  sport);
        if (source != null) stmt = stmt.param("source", source);
        if (from   != null) stmt = stmt.param("from",   java.sql.Timestamp.from(from));
        if (to     != null) stmt = stmt.param("to",     java.sql.Timestamp.from(to));

        return stmt.query((rs, rowNum) -> new ActivityListItem(
                rs.getObject("id", UUID.class),
                rs.getString("sport"),
                rs.getString("name"),
                toInstant(rs, "started_at"),
                rs.getInt("duration_seconds"),
                rs.getBigDecimal("distance_meters"),
                nullableInt(rs, "avg_heart_rate"),
                nullableInt(rs, "avg_power"),
                rs.getBigDecimal("tss"),
                rs.getString("source")
        )).list();
    }

    @Override
    public long count(UUID userId, String sport, String source, Instant from, Instant to) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*) FROM activities
                 WHERE user_id = :userId
                   AND deleted_at IS NULL
                """);
        if (sport  != null) sql.append("  AND sport  = :sport\n");
        if (source != null) sql.append("  AND source = :source\n");
        if (from   != null) sql.append("  AND started_at >= :from\n");
        if (to     != null) sql.append("  AND started_at <= :to\n");

        var stmt = jdbcClient.sql(sql.toString()).param("userId", userId);
        if (sport  != null) stmt = stmt.param("sport",  sport);
        if (source != null) stmt = stmt.param("source", source);
        if (from   != null) stmt = stmt.param("from",   java.sql.Timestamp.from(from));
        if (to     != null) stmt = stmt.param("to",     java.sql.Timestamp.from(to));

        return stmt.query(Long.class).single();
    }

    @Override
    public Optional<ActivityDetail> findDetailById(UUID userId, UUID activityId) {
        return jdbcClient.sql("""
                SELECT a.id, a.sport, a.sub_sport, a.name, a.description,
                       a.started_at, a.duration_seconds, a.moving_time_seconds,
                       a.distance_meters, a.elevation_gain_meters, a.calories,
                       a.avg_heart_rate, a.max_heart_rate,
                       a.avg_power, a.max_power, a.normalized_power,
                       a.intensity_factor, a.tss, a.avg_cadence, a.avg_speed,
                       a.start_lat, a.start_lng,
                       a.gear_id, g.name AS gear_name,
                       a.source, a.raw_file_format
                  FROM activities a
                  LEFT JOIN gear g ON g.id = a.gear_id
                 WHERE a.id = :id
                   AND a.user_id = :userId
                   AND a.deleted_at IS NULL
                """)
                .param("id",     activityId)
                .param("userId", userId)
                .query((rs, rowNum) -> {
                    UUID gearId = rs.getObject("gear_id", UUID.class);
                    GearRef gear = gearId != null
                            ? new GearRef(gearId, rs.getString("gear_name"))
                            : null;
                    return new ActivityDetail(
                            rs.getObject("id", UUID.class),
                            rs.getString("sport"),
                            rs.getString("sub_sport"),
                            rs.getString("name"),
                            rs.getString("description"),
                            toInstant(rs, "started_at"),
                            rs.getInt("duration_seconds"),
                            nullableInt(rs, "moving_time_seconds"),
                            rs.getBigDecimal("distance_meters"),
                            rs.getBigDecimal("elevation_gain_meters"),
                            nullableInt(rs, "calories"),
                            nullableInt(rs, "avg_heart_rate"),
                            nullableInt(rs, "max_heart_rate"),
                            nullableInt(rs, "avg_power"),
                            nullableInt(rs, "max_power"),
                            nullableInt(rs, "normalized_power"),
                            rs.getBigDecimal("intensity_factor"),
                            rs.getBigDecimal("tss"),
                            nullableInt(rs, "avg_cadence"),
                            rs.getBigDecimal("avg_speed"),
                            rs.getBigDecimal("start_lat"),
                            rs.getBigDecimal("start_lng"),
                            gear,
                            rs.getString("source"),
                            rs.getString("raw_file_format")
                    );
                })
                .optional();
    }

    @Override
    @Transactional
    public boolean updateUserFields(UUID activityId, UUID userId,
                                    String name, String description, UUID gearId) {
        int updated = jdbcClient.sql("""
                UPDATE activities SET
                    name        = COALESCE(:name, name),
                    description = COALESCE(:description, description),
                    gear_id     = COALESCE(:gearId, gear_id),
                    updated_at  = now()
                WHERE id = :id
                  AND user_id = :userId
                  AND deleted_at IS NULL
                """)
                .param("id",          activityId)
                .param("userId",      userId)
                .param("name",        name)
                .param("description", description)
                .param("gearId",      gearId)
                .update();
        return updated > 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @Override
    public Optional<String> findRawFilePath(UUID userId, UUID activityId) {
        return jdbcClient.sql("""
                SELECT raw_file_path FROM activities
                 WHERE id = :id
                   AND user_id = :userId
                   AND deleted_at IS NULL
                   AND raw_file_path IS NOT NULL
                """)
                .param("id",     activityId)
                .param("userId", userId)
                .query(String.class)
                .optional();
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static Instant toInstant(ResultSet rs, String col) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(col);
        return ts != null ? ts.toInstant() : null;
    }
}

