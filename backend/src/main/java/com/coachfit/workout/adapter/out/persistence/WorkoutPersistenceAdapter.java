package com.coachfit.workout.adapter.out.persistence;

import com.coachfit.workout.application.port.in.GetWorkoutUseCase.WorkoutDetail;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase.WorkoutListItem;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase.TemplateListItem;
import com.coachfit.workout.application.port.out.WorkoutPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link WorkoutPersistencePort}.
 *
 * <p>JPA is used for inserts (via {@link WorkoutEntity}).
 * JdbcClient handles reads, updates, and soft-deletes to avoid loading
 * unnecessary fields on hot read paths.
 */
@Repository
class WorkoutPersistenceAdapter implements WorkoutPersistencePort {

    private final WorkoutJpaRepository repo;
    private final JdbcClient           jdbcClient;

    WorkoutPersistenceAdapter(WorkoutJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID save(UUID userId,
                     String name,
                     String sport,
                     String description,
                     String stepsJson,
                     List<String> tags,
                     boolean isTemplate,
                     boolean isPublic,
                     String source,
                     Integer estimatedDurationSeconds,
                     BigDecimal estimatedTss) {

        WorkoutEntity entity = new WorkoutEntity(
                userId, name, sport, description, stepsJson,
                tags != null ? tags.toArray(new String[0]) : null,
                isTemplate, isPublic, source,
                estimatedDurationSeconds, estimatedTss);
        return repo.save(entity).id;
    }

    @Override
    @Transactional
    public boolean update(UUID workoutId,
                          UUID userId,
                          String name,
                          String sport,
                          String description,
                          String stepsJson,
                          List<String> tags,
                          boolean isTemplate,
                          boolean isPublic,
                          Integer estimatedDurationSeconds,
                          BigDecimal estimatedTss) {

        int rows = jdbcClient.sql("""
                UPDATE workouts SET
                    name                       = :name,
                    sport                      = :sport,
                    description                = :description,
                    steps                      = :steps::jsonb,
                    tags                       = :tags,
                    is_template                = :isTemplate,
                    is_public                  = :isPublic,
                    estimated_duration_seconds = :estimatedDuration,
                    estimated_tss              = :estimatedTss,
                    updated_at                 = now()
                WHERE id      = :id
                  AND user_id = :userId
                  AND deleted_at IS NULL
                """)
                .param("id",                workoutId)
                .param("userId",            userId)
                .param("name",              name)
                .param("sport",             sport)
                .param("description",       description)
                .param("steps",             stepsJson)
                .param("tags",              tags != null ? tags.toArray(new String[0]) : null)
                .param("isTemplate",        isTemplate)
                .param("isPublic",          isPublic)
                .param("estimatedDuration", estimatedDurationSeconds)
                .param("estimatedTss",      estimatedTss)
                .update();
        return rows > 0;
    }

    @Override
    @Transactional
    public boolean softDelete(UUID workoutId, UUID userId) {
        int rows = jdbcClient.sql("""
                UPDATE workouts
                   SET deleted_at = now(), updated_at = now()
                 WHERE id      = :id
                   AND user_id = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",     workoutId)
                .param("userId", userId)
                .update();
        return rows > 0;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Override
    public Optional<WorkoutDetail> findDetailById(UUID userId, UUID workoutId) {
        return jdbcClient.sql("""
                SELECT id, user_id, name, sport, description,
                       estimated_duration_seconds, estimated_tss,
                       steps, tags, is_template, is_public, source,
                       created_at, updated_at
                  FROM workouts
                 WHERE id = :id
                   AND deleted_at IS NULL
                   AND (user_id = :userId OR user_id IS NULL)
                """)
                .param("id",     workoutId)
                .param("userId", userId)
                .query((rs, rowNum) -> toDetail(rs))
                .optional();
    }

    @Override
    public List<WorkoutListItem> list(UUID userId, String sport, Boolean isTemplate,
                                      int page, int size) {
        StringBuilder sql = new StringBuilder("""
                SELECT id, name, sport, description,
                       estimated_duration_seconds, estimated_tss,
                       tags, is_template, is_public, source,
                       created_at, updated_at
                  FROM workouts
                 WHERE user_id = :userId
                   AND deleted_at IS NULL
                """);
        if (sport      != null) sql.append("  AND sport       = :sport\n");
        if (isTemplate != null) sql.append("  AND is_template = :isTemplate\n");
        sql.append(" ORDER BY created_at DESC\n");
        sql.append(" LIMIT :size OFFSET :offset");

        var stmt = jdbcClient.sql(sql.toString())
                .param("userId", userId)
                .param("size",   size)
                .param("offset", (long) page * size);
        if (sport      != null) stmt = stmt.param("sport",      sport);
        if (isTemplate != null) stmt = stmt.param("isTemplate", isTemplate);

        return stmt.query((rs, rowNum) -> toListItem(rs)).list();
    }

    @Override
    public long count(UUID userId, String sport, Boolean isTemplate) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*) FROM workouts
                 WHERE user_id = :userId
                   AND deleted_at IS NULL
                """);
        if (sport      != null) sql.append("  AND sport       = :sport\n");
        if (isTemplate != null) sql.append("  AND is_template = :isTemplate\n");

        var stmt = jdbcClient.sql(sql.toString()).param("userId", userId);
        if (sport      != null) stmt = stmt.param("sport",      sport);
        if (isTemplate != null) stmt = stmt.param("isTemplate", isTemplate);

        return stmt.query(Long.class).single();
    }

    @Override
    public List<TemplateListItem> listTemplates(String sport, int page, int size) {
        StringBuilder sql = new StringBuilder("""
                SELECT id, name, sport, description,
                       estimated_duration_seconds, estimated_tss,
                       tags, source, created_at
                  FROM workouts
                 WHERE is_template = true
                   AND (user_id IS NULL OR is_public = true)
                   AND deleted_at IS NULL
                """);
        if (sport != null) sql.append("  AND sport = :sport\n");
        sql.append(" ORDER BY created_at DESC\n");
        sql.append(" LIMIT :size OFFSET :offset");

        var stmt = jdbcClient.sql(sql.toString())
                .param("size",   size)
                .param("offset", (long) page * size);
        if (sport != null) stmt = stmt.param("sport", sport);

        return stmt.query((rs, rowNum) -> toTemplateItem(rs)).list();
    }

    @Override
    public long countTemplates(String sport) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*) FROM workouts
                 WHERE is_template = true
                   AND (user_id IS NULL OR is_public = true)
                   AND deleted_at IS NULL
                """);
        if (sport != null) sql.append("  AND sport = :sport\n");

        var stmt = jdbcClient.sql(sql.toString());
        if (sport != null) stmt = stmt.param("sport", sport);

        return stmt.query(Long.class).single();
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private WorkoutDetail toDetail(ResultSet rs) throws SQLException {
        return new WorkoutDetail(
                rs.getObject("id",      UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("name"),
                rs.getString("sport"),
                rs.getString("description"),
                nullableInt(rs, "estimated_duration_seconds"),
                rs.getBigDecimal("estimated_tss"),
                rs.getString("steps"),
                arrayToList(rs, "tags"),
                rs.getBoolean("is_template"),
                rs.getBoolean("is_public"),
                rs.getString("source"),
                toInstant(rs, "created_at"),
                toInstant(rs, "updated_at")
        );
    }

    private WorkoutListItem toListItem(ResultSet rs) throws SQLException {
        return new WorkoutListItem(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("sport"),
                rs.getString("description"),
                nullableInt(rs, "estimated_duration_seconds"),
                rs.getBigDecimal("estimated_tss"),
                arrayToList(rs, "tags"),
                rs.getBoolean("is_template"),
                rs.getBoolean("is_public"),
                rs.getString("source"),
                toInstant(rs, "created_at"),
                toInstant(rs, "updated_at")
        );
    }

    private TemplateListItem toTemplateItem(ResultSet rs) throws SQLException {
        return new TemplateListItem(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("sport"),
                rs.getString("description"),
                nullableInt(rs, "estimated_duration_seconds"),
                rs.getBigDecimal("estimated_tss"),
                arrayToList(rs, "tags"),
                rs.getString("source"),
                toInstant(rs, "created_at")
        );
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static List<String> arrayToList(ResultSet rs, String col) throws SQLException {
        Array arr = rs.getArray(col);
        if (arr == null) return Collections.emptyList();
        String[] vals = (String[]) arr.getArray();
        return vals == null ? Collections.emptyList() : Arrays.asList(vals);
    }

    private static Instant toInstant(ResultSet rs, String col) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(col);
        return ts != null ? ts.toInstant() : null;
    }
}
