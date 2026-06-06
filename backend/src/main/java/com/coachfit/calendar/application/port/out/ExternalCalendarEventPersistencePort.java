package com.coachfit.calendar.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for externally managed calendar events.
 *
 * <p>The adapter may write both {@code calendar_events} and {@code workouts}
 * so imported planned workouts have a real workout definition linked to the calendar.
 */
public interface ExternalCalendarEventPersistencePort {

    UUID createWorkout(UUID userId, ExternalWorkoutDraft draft);

    boolean updateWorkout(UUID workoutId, UUID userId, ExternalWorkoutDraft draft);

    boolean workoutAccessible(UUID userId, UUID workoutId);

    UUID createEvent(UUID userId, ExternalEventDraft draft);

    boolean updateEvent(UUID eventId, UUID userId, ExternalEventDraft draft);

    Optional<ExternalEventRow> findById(UUID eventId);

    Optional<ExternalEventRow> findByExternalId(UUID userId, String externalSource, String externalId);

    Optional<ExternalEventRow> findByUid(UUID userId, String uid);

    List<ExternalEventRow> findByDateRange(UUID userId, LocalDate oldest, LocalDate newest,
                                           List<String> eventCategories, List<String> eventTypes,
                                           Integer limit);

    int softDeleteById(UUID eventId, UUID userId);

    int softDeleteByExternalId(UUID userId, String externalSource, String externalId);

    int softDeleteRange(UUID userId, String externalSource, LocalDate oldest,
                        LocalDate newest, List<String> eventCategories, List<String> eventTypes);

    record ExternalWorkoutDraft(
            String name,
            String sport,
            String description,
            String stepsJson,
            List<String> tags,
            Integer estimatedDurationSeconds,
            BigDecimal estimatedTss
    ) {}

    record ExternalEventDraft(
            LocalDate date,
            String eventType,
            UUID workoutId,
            String title,
            String description,
            String externalCategory,
            String externalUid,
            String externalId,
            String externalSource,
            String externalPayloadJson
    ) {}

    record ExternalEventRow(
            UUID id,
            UUID userId,
            LocalDate date,
            String eventType,
            UUID workoutId,
            String title,
            String description,
            String status,
            String externalCategory,
            String externalUid,
            String externalId,
            String externalSource,
            String workoutSport,
            Integer workoutDuration,
            BigDecimal workoutTss
    ) {}
}
