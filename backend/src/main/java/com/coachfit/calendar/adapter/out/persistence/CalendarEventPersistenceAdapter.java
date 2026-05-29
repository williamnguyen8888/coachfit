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
 */
@Repository
class CalendarEventPersistenceAdapter implements CalendarEventPersistencePort {

    private final CalendarEventJpaRepository repo;
    private final JdbcClient                 jdbcClient;

    CalendarEventPersistenceAdapter(CalendarEventJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public UUID save(UUID userId, LocalDate date, String eventType,
                     UUID workoutId, String title, String description) {
        CalendarEventEntity entity = new CalendarEventEntity(userId, date, eventType, title);
        entity.workoutId   = workoutId;
        entity.description = description;
        return repo.save(entity).id;
    }

    @Override
    public Optional<CalendarEventSummary> findById(UUID eventId) {
        return repo.findById(eventId)
                .filter(e -> e.deletedAt == null)
                .map(this::toSummary);
    }

    @Override
    public List<CalendarEventSummary> findByUserAndDateRange(UUID userId, LocalDate from, LocalDate to) {
        return repo.findByUserIdAndDateBetweenAndDeletedAtIsNull(userId, from, to)
                .stream().map(this::toSummary).toList();
    }

    @Override
    @Transactional
    public void linkActivity(UUID eventId, UUID activityId, BigDecimal complianceScore) {
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET activity_id      = :activityId,
                       compliance_score = :complianceScore,
                       status           = 'completed',
                       updated_at       = now()
                 WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id",              eventId)
                .param("activityId",      activityId)
                .param("complianceScore", complianceScore)
                .update();
    }

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

    private CalendarEventSummary toSummary(CalendarEventEntity e) {
        return new CalendarEventSummary(e.id, e.userId, e.date, e.eventType,
                e.workoutId, e.activityId, e.title, e.status,
                e.orderIndex, e.complianceScore);
    }
}
