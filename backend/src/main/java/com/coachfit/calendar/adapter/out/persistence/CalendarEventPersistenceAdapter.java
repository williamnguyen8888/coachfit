package com.coachfit.calendar.adapter.out.persistence;

import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA + JdbcClient adapter implementing {@link CalendarEventPersistencePort}.
 *
 * <p>Simple reads use Spring Data JPA via {@link CalendarEventJpaRepository}.
 * Bulk / complex writes use {@link JdbcClient} for fine-grained SQL control.
 */
@Repository
class CalendarEventPersistenceAdapter implements CalendarEventPersistencePort {

    private final CalendarEventJpaRepository repo;
    private final JdbcClient                 jdbcClient;

    CalendarEventPersistenceAdapter(CalendarEventJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    // ── save ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID save(UUID userId, LocalDate date, String eventType,
                     UUID workoutId, String title, String description) {
        CalendarEventEntity entity = new CalendarEventEntity(userId, date, eventType, title);
        entity.workoutId   = workoutId;
        entity.description = description;
        return repo.save(entity).id;
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean update(UUID eventId, UUID userId, LocalDate date, String eventType,
                          String title, String description, UUID workoutId) {
        int rows = jdbcClient.sql("""
                UPDATE calendar_events
                   SET date        = :date,
                       event_type  = :eventType,
                       title       = :title,
                       description = :description,
                       workout_id  = :workoutId,
                       updated_at  = now()
                 WHERE id          = :id
                   AND user_id     = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",          eventId)
                .param("userId",      userId)
                .param("date",        date)
                .param("eventType",   eventType)
                .param("title",       title)
                .param("description", description)
                .param("workoutId",   workoutId)
                .update();
        return rows > 0;
    }

    // ── updateStatus ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean updateStatus(UUID eventId, UUID userId, String newStatus) {
        int rows = jdbcClient.sql("""
                UPDATE calendar_events
                   SET status     = :status,
                       updated_at = now()
                 WHERE id         = :id
                   AND user_id    = :userId
                   AND deleted_at IS NULL
                """)
                .param("id",     eventId)
                .param("userId", userId)
                .param("status", newStatus)
                .update();
        return rows > 0;
    }

    // ── linkActivity ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void linkActivity(UUID eventId, UUID activityId, BigDecimal complianceScore) {
        // compliance_score >= 50 → completed, else partial
        String newStatus = (complianceScore != null
                && complianceScore.compareTo(BigDecimal.valueOf(50)) >= 0)
                ? "completed" : "partial";

        jdbcClient.sql("""
                UPDATE calendar_events
                   SET activity_id      = :activityId,
                       compliance_score = :complianceScore,
                       status           = :status,
                       updated_at       = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id",              eventId)
                .param("activityId",      activityId)
                .param("complianceScore", complianceScore)
                .param("status",          newStatus)
                .update();
    }

    // ── reorder ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void reorder(UUID userId, List<ReorderEntry> entries) {
        for (ReorderEntry entry : entries) {
            jdbcClient.sql("""
                    UPDATE calendar_events
                       SET order_index = :idx,
                           updated_at  = now()
                     WHERE id          = :id
                       AND user_id     = :userId
                       AND deleted_at IS NULL
                    """)
                    .param("idx",    entry.newOrderIndex())
                    .param("id",     entry.eventId())
                    .param("userId", userId)
                    .update();
        }
    }

    // ── softDelete ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void softDelete(UUID eventId) {
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET deleted_at = now(), updated_at = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", eventId)
                .update();
    }

    // ── findById ──────────────────────────────────────────────────────────────

    @Override
    public Optional<CalendarEventSummary> findById(UUID eventId) {
        return repo.findById(eventId)
                .filter(e -> e.deletedAt == null)
                .map(this::toSummary);
    }

    // ── findByUserAndDateRange ────────────────────────────────────────────────

    @Override
    public List<CalendarEventSummary> findByUserAndDateRange(UUID userId, LocalDate from, LocalDate to) {
        return repo.findByUserIdAndDateBetweenAndDeletedAtIsNullOrderByDateAscOrderIndexAsc(userId, from, to)
                .stream().map(this::toSummary).toList();
    }

    // ── autoSkipPastPlanned ───────────────────────────────────────────────────

    @Override
    @Transactional
    public int autoSkipPastPlanned() {
        return jdbcClient.sql("""
                UPDATE calendar_events
                   SET status     = 'skipped',
                       updated_at = now()
                 WHERE status     = 'planned'
                   AND date       < CURRENT_DATE
                   AND deleted_at IS NULL
                """)
                .update();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private CalendarEventSummary toSummary(CalendarEventEntity e) {
        return new CalendarEventSummary(
                e.id, e.userId, e.date, e.eventType,
                e.workoutId, e.activityId,
                e.title, e.description,
                e.status, e.orderIndex, e.complianceScore
        );
    }
}
