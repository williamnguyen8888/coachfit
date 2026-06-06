package com.coachfit.calendar.application.port.in;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Use case for third-party systems pushing planned workouts and notes onto an athlete calendar.
 *
 * <p>The public API is intentionally close to Intervals.icu's calendar events API:
 * callers can use {@code athlete/0}, provide {@code external_id}, bulk upsert,
 * and delete a date range by category.
 */
public interface ManageExternalCalendarEventsUseCase {

    ExternalEventView create(UUID athleteUserId, String externalSource,
                             ExternalEventCommand command, UpsertMode upsertMode);

    List<ExternalEventView> bulkCreate(UUID athleteUserId, String externalSource,
                                       List<ExternalEventCommand> commands, UpsertMode upsertMode);

    List<ExternalEventView> list(UUID athleteUserId, LocalDate oldest, LocalDate newest,
                                 List<String> categories, Integer limit);

    ExternalEventView update(UUID athleteUserId, UUID eventId, String externalSource,
                             ExternalEventCommand command);

    int delete(UUID athleteUserId, UUID eventId);

    int bulkDelete(UUID athleteUserId, String externalSource, List<DoomedEvent> events);

    int deleteRange(UUID athleteUserId, String externalSource, LocalDate oldest,
                    LocalDate newest, List<String> categories);

    enum UpsertMode {
        NONE,
        EXTERNAL_ID,
        UID
    }

    record ExternalEventCommand(
            String category,
            String startDateLocal,
            LocalDate date,
            String name,
            String description,
            String type,
            Integer movingTime,
            Integer timeTarget,
            BigDecimal trainingLoad,
            BigDecimal loadTarget,
            BigDecimal distance,
            BigDecimal distanceTarget,
            List<String> tags,
            UUID workoutId,
            String uid,
            String externalId,
            String filename,
            String fileContents,
            String fileContentsBase64,
            JsonNode steps,
            JsonNode workout,
            JsonNode workoutDoc,
            JsonNode rawPayload
    ) {}

    record DoomedEvent(UUID id, String externalId) {}

    record ExternalEventView(
            UUID id,
            UUID athleteUserId,
            LocalDate date,
            String category,
            String name,
            String description,
            String type,
            Integer movingTime,
            BigDecimal trainingLoad,
            UUID workoutId,
            String uid,
            String externalId,
            String externalSource,
            String status
    ) {}
}
