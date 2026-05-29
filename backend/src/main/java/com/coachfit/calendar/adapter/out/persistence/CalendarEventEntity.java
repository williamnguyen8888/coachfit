package com.coachfit.calendar.adapter.out.persistence;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity mapping the {@code calendar_events} table.
 */
@Entity
@Table(name = "calendar_events")
class CalendarEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "date", nullable = false)
    LocalDate date;

    @Column(name = "event_type", nullable = false, length = 20)
    String eventType;   // workout / note / race / rest

    @Column(name = "workout_id")
    UUID workoutId;     // nullable

    @Column(name = "activity_id")
    UUID activityId;    // nullable

    @Column(name = "title", nullable = false, length = 255)
    String title;

    @Column(name = "description")
    String description;

    @Column(name = "status", nullable = false, length = 20)
    String status;      // planned / completed / skipped / partial

    @Column(name = "order_index", nullable = false)
    short orderIndex;

    @Column(name = "compliance_score", precision = 5, scale = 2)
    BigDecimal complianceScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @Column(name = "deleted_at")
    Instant deletedAt;

    protected CalendarEventEntity() {}

    CalendarEventEntity(UUID userId, LocalDate date, String eventType, String title) {
        this.userId     = userId;
        this.date       = date;
        this.eventType  = eventType;
        this.title      = title;
        this.status     = "planned";
        this.orderIndex = 0;
        Instant now     = Instant.now();
        this.createdAt  = now;
        this.updatedAt  = now;
    }
}
