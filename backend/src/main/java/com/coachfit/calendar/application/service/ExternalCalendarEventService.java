package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.UpsertMode;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalEventDraft;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalEventRow;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalWorkoutDraft;
import com.coachfit.shared.domain.SportNormalizer;
import com.coachfit.shared.domain.workout.WorkoutCalculator;
import com.coachfit.shared.domain.workout.WorkoutDescriptionParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service for external calendar events.
 *
 * <p>For WORKOUT events, this service creates or updates a lightweight workout
 * definition when the request does not reference an existing {@code workout_id}.
 */
@Service
public class ExternalCalendarEventService implements ManageExternalCalendarEventsUseCase {

    private static final Logger log = LoggerFactory.getLogger(ExternalCalendarEventService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_EXTERNAL_ID_LENGTH = 255;
    private static final int MAX_UID_LENGTH = 255;
    private static final int DEFAULT_WORKOUT_SECONDS = 3600;

    private final ExternalCalendarEventPersistencePort port;

    public ExternalCalendarEventService(ExternalCalendarEventPersistencePort port) {
        this.port = port;
    }

    @Override
    @Transactional
    public ExternalEventView create(UUID athleteUserId, String externalSource,
                                    ExternalEventCommand command, UpsertMode upsertMode) {
        NormalizedEvent normalized = normalize(command, externalSource, null);

        Optional<ExternalEventRow> existing = findExistingForUpsert(athleteUserId, normalized, upsertMode);

        if (existing.isPresent()) {
            return updateExisting(athleteUserId, existing.get(), normalized, command);
        }

        UUID workoutId = resolveWorkoutId(athleteUserId, normalized, command, null);
        ExternalEventDraft draft = normalized.toDraft(workoutId);
        UUID id = port.createEvent(athleteUserId, draft);

        log.info("External calendar event created: id={} user={} source={} externalId={}",
                id, athleteUserId, normalized.externalSource(), normalized.externalId());
        return toView(findOwned(athleteUserId, id));
    }

    @Override
    @Transactional
    public List<ExternalEventView> bulkCreate(UUID athleteUserId, String externalSource,
                                              List<ExternalEventCommand> commands, UpsertMode upsertMode) {
        if (commands == null || commands.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "events must not be empty");
        }
        if (commands.size() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bulk events limit is 500");
        }
        return commands.stream()
                .map(command -> create(athleteUserId, externalSource, command, upsertMode))
                .toList();
    }

    @Override
    public List<ExternalEventView> list(UUID athleteUserId, LocalDate oldest, LocalDate newest,
                                        List<String> categories, Integer limit) {
        if (oldest == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "oldest is required");
        }
        LocalDate effectiveNewest = newest != null ? newest : oldest.plusDays(6);
        validateDateRange(oldest, effectiveNewest);
        List<String> eventCategories = normalizeCategories(categories);
        List<String> eventTypes = categoriesToEventTypes(eventCategories);
        Integer effectiveLimit = limit != null ? Math.min(Math.max(limit, 1), 1000) : null;

        return port.findByDateRange(athleteUserId, oldest, effectiveNewest, eventCategories, eventTypes, effectiveLimit)
                .stream()
                .map(this::toView)
                .toList();
    }

    @Override
    @Transactional
    public ExternalEventView update(UUID athleteUserId, UUID eventId, String externalSource,
                                    ExternalEventCommand command) {
        ExternalEventRow existing = findOwned(athleteUserId, eventId);
        NormalizedEvent normalized = normalize(command, externalSource, existing);
        return updateExisting(athleteUserId, existing, normalized, command);
    }

    @Override
    @Transactional
    public int delete(UUID athleteUserId, UUID eventId) {
        int deleted = port.softDeleteById(eventId, athleteUserId);
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        return deleted;
    }

    @Override
    @Transactional
    public int bulkDelete(UUID athleteUserId, String externalSource, List<DoomedEvent> events) {
        if (events == null || events.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "events must not be empty");
        }
        String source = normalizeSource(externalSource);
        int deleted = 0;
        for (DoomedEvent event : events) {
            if (event.externalId() != null && !event.externalId().isBlank()) {
                deleted += port.softDeleteByExternalId(athleteUserId, source, event.externalId().trim());
            } else if (event.id() != null) {
                deleted += port.softDeleteById(event.id(), athleteUserId);
            }
        }
        return deleted;
    }

    @Override
    @Transactional
    public int deleteRange(UUID athleteUserId, String externalSource, LocalDate oldest,
                           LocalDate newest, List<String> categories) {
        if (oldest == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "oldest is required");
        }
        if (categories == null || categories.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "category is required");
        }
        LocalDate effectiveNewest = newest != null ? newest : LocalDate.of(9999, 12, 31);
        if (oldest.isAfter(effectiveNewest)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "oldest must not be after newest");
        }
        List<String> eventCategories = normalizeCategories(categories);
        List<String> eventTypes = categoriesToEventTypes(eventCategories);
        if (eventCategories.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "category is required");
        }
        return port.softDeleteRange(
                athleteUserId,
                normalizeSource(externalSource),
                oldest,
                effectiveNewest,
                eventCategories,
                eventTypes
        );
    }

    private Optional<ExternalEventRow> findExistingForUpsert(UUID athleteUserId, NormalizedEvent normalized,
                                                            UpsertMode upsertMode) {
        UpsertMode mode = upsertMode != null ? upsertMode : UpsertMode.NONE;
        return switch (mode) {
            case NONE -> Optional.empty();
            case EXTERNAL_ID -> normalized.externalId() == null
                    ? Optional.empty()
                    : port.findByExternalId(athleteUserId, normalized.externalSource(), normalized.externalId());
            case UID -> {
                if (normalized.uid() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "uid is required when upsertOnUid=true");
                }
                yield port.findByUid(athleteUserId, normalized.uid());
            }
        };
    }

    private ExternalEventView updateExisting(UUID athleteUserId, ExternalEventRow existing,
                                             NormalizedEvent normalized, ExternalEventCommand command) {
        UUID workoutId = resolveWorkoutId(athleteUserId, normalized, command, existing.workoutId());
        boolean updated = port.updateEvent(existing.id(), athleteUserId, normalized.toDraft(workoutId));
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        log.info("External calendar event updated: id={} user={} source={} externalId={}",
                existing.id(), athleteUserId, normalized.externalSource(), normalized.externalId());
        return toView(findOwned(athleteUserId, existing.id()));
    }

    private UUID resolveWorkoutId(UUID userId, NormalizedEvent event,
                                  ExternalEventCommand command, UUID existingWorkoutId) {
        if (!"workout".equals(event.eventType())) {
            return null;
        }

        if (command.workoutId() != null) {
            if (!port.workoutAccessible(userId, command.workoutId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found");
            }
            return command.workoutId();
        }

        ExternalWorkoutDraft draft = buildWorkoutDraft(event, command);
        if (existingWorkoutId != null && port.updateWorkout(existingWorkoutId, userId, draft)) {
            return existingWorkoutId;
        }
        return port.createWorkout(userId, draft);
    }

    private ExternalWorkoutDraft buildWorkoutDraft(NormalizedEvent event, ExternalEventCommand command) {
        String sport = SportNormalizer.canonical(firstNonBlank(
                command.type(),
                textAt(command.workout(), "sport"),
                textAt(command.workout(), "type"),
                "other"
        ));

        String stepsJson = extractStepsJson(command);
        if (stepsJson == null) {
            stepsJson = WorkoutDescriptionParser.parseToStepsJson(event.description(), sport).orElse(null);
        }
        if (stepsJson == null) {
            int duration = firstPositive(command.movingTime(), command.timeTarget(), DEFAULT_WORKOUT_SECONDS);
            stepsJson = defaultOpenWorkoutSteps(event.title(), duration);
        }

        var calc = WorkoutCalculator.calculate(stepsJson, sport);
        Integer estimatedDuration = firstPositive(
                command.movingTime(),
                command.timeTarget(),
                calc.durationSeconds() > 0 ? calc.durationSeconds() : null
        );
        BigDecimal estimatedTss = firstNonNull(
                command.trainingLoad(),
                command.loadTarget(),
                calc.tss()
        );

        return new ExternalWorkoutDraft(
                event.title(),
                sport,
                event.description(),
                stepsJson,
                command.tags(),
                estimatedDuration,
                estimatedTss
        );
    }

    private NormalizedEvent normalize(ExternalEventCommand command, String externalSource,
                                      ExternalEventRow existing) {
        if (command == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "request body is required");
        }

        LocalDate date = resolveDate(command, existing);
        String category = normalizeCategory(firstNonBlank(
                command.category(),
                existing != null ? firstNonBlank(existing.externalCategory(), eventTypeToCategory(existing.eventType())) : null,
                "WORKOUT"
        ));
        String eventType = categoryToEventType(category);
        String title = validateTitle(firstNonBlank(
                command.name(),
                textAt(command.workout(), "name"),
                command.filename(),
                existing != null ? existing.title() : null,
                "Imported " + category.toLowerCase(Locale.ROOT)
        ));
        String externalId = normalizeExternalId(firstNonBlank(
                command.externalId(),
                existing != null ? existing.externalId() : null
        ));
        String uid = normalizeUid(firstNonBlank(
                command.uid(),
                existing != null ? existing.externalUid() : null
        ));
        String source = normalizeSource(firstNonBlank(
                externalSource,
                existing != null ? existing.externalSource() : null
        ));

        String description = command.description() != null
                ? command.description()
                : existing != null ? existing.description() : null;
        Integer movingTime = firstPositive(
                command.movingTime(),
                command.timeTarget(),
                existing != null ? existing.workoutDuration() : null
        );
        BigDecimal trainingLoad = firstNonNull(
                command.trainingLoad(),
                command.loadTarget(),
                existing != null ? existing.workoutTss() : null
        );
        String type = firstNonBlank(
                command.type(),
                textAt(command.workout(), "sport"),
                existing != null ? existing.workoutSport() : null
        );

        return new NormalizedEvent(
                date,
                category,
                eventType,
                title,
                description,
                type,
                movingTime,
                trainingLoad,
                uid,
                externalId,
                source,
                toPayloadJson(command.rawPayload())
        );
    }

    private ExternalEventRow findOwned(UUID userId, UUID eventId) {
        ExternalEventRow row = port.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found"));
        if (!userId.equals(row.userId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        return row;
    }

    private static LocalDate resolveDate(ExternalEventCommand command, ExternalEventRow existing) {
        if (command.date() != null) {
            return command.date();
        }
        if (command.startDateLocal() != null && !command.startDateLocal().isBlank()) {
            String raw = command.startDateLocal().trim();
            String datePart = raw.length() >= 10 ? raw.substring(0, 10) : raw;
            try {
                return LocalDate.parse(datePart);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "start_date_local must start with an ISO date");
            }
        }
        if (existing != null) {
            return existing.date();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "start_date_local is required");
    }

    private static String extractStepsJson(ExternalEventCommand command) {
        JsonNode steps = command.steps();
        if (steps != null && steps.isArray() && !steps.isEmpty()) {
            return toJson(steps);
        }

        JsonNode workoutSteps = command.workout() != null ? command.workout().get("steps") : null;
        if (workoutSteps != null && workoutSteps.isArray() && !workoutSteps.isEmpty()) {
            return toJson(workoutSteps);
        }

        JsonNode docSteps = command.workoutDoc() != null ? command.workoutDoc().get("steps") : null;
        if (docSteps != null && docSteps.isArray() && !docSteps.isEmpty()) {
            return toJson(docSteps);
        }
        if (command.workoutDoc() != null && command.workoutDoc().isArray() && !command.workoutDoc().isEmpty()) {
            return toJson(command.workoutDoc());
        }
        return null;
    }

    private static String defaultOpenWorkoutSteps(String title, int durationSeconds) {
        ArrayNode steps = MAPPER.createArrayNode();
        ObjectNode step = MAPPER.createObjectNode();
        step.put("type", "work");
        step.put("name", title);

        ObjectNode duration = MAPPER.createObjectNode();
        duration.put("type", "time");
        duration.put("value", Math.max(1, durationSeconds));
        step.set("duration", duration);

        ObjectNode target = MAPPER.createObjectNode();
        target.put("type", "open");
        step.set("target", target);

        steps.add(step);
        return toJson(steps);
    }

    private static String normalizeCategory(String category) {
        return category == null || category.isBlank()
                ? "WORKOUT"
                : category.trim().toUpperCase(Locale.ROOT);
    }

    private static String categoryToEventType(String category) {
        return "workout";
    }

    private static String eventTypeToCategory(String eventType) {
        return "WORKOUT";
    }

    private static List<String> categoriesToEventTypes(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return List.of("workout");
    }

    private static List<String> normalizeCategories(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private static String validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        String trimmed = title.trim();
        if (trimmed.length() > MAX_TITLE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "name must not exceed " + MAX_TITLE_LENGTH + " characters");
        }
        return trimmed;
    }

    private static String normalizeExternalId(String externalId) {
        if (externalId == null || externalId.isBlank()) {
            return null;
        }
        String trimmed = externalId.trim();
        if (trimmed.length() > MAX_EXTERNAL_ID_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "external_id must not exceed " + MAX_EXTERNAL_ID_LENGTH + " characters");
        }
        return trimmed;
    }

    private static String normalizeUid(String uid) {
        if (uid == null || uid.isBlank()) {
            return null;
        }
        String trimmed = uid.trim();
        if (trimmed.length() > MAX_UID_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "uid must not exceed " + MAX_UID_LENGTH + " characters");
        }
        return trimmed;
    }

    private static String normalizeSource(String source) {
        String value = source == null || source.isBlank() ? "api" : source.trim();
        value = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
        if (value.isBlank()) {
            return "api";
        }
        return value.length() > 100 ? value.substring(0, 100) : value;
    }

    private static String toPayloadJson(JsonNode rawPayload) {
        if (rawPayload == null || rawPayload.isNull()) {
            return null;
        }
        return toJson(rawPayload);
    }

    private static String toJson(JsonNode node) {
        try {
            return MAPPER.writeValueAsString(node);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON payload");
        }
    }

    private static String textAt(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) {
            return null;
        }
        JsonNode value = node.get(field);
        return value.isTextual() ? value.asText() : null;
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static Integer firstPositive(Integer... values) {
        for (Integer value : values) {
            if (value != null && value > 0) {
                return value;
            }
        }
        return null;
    }

    private static void validateDateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "oldest must not be after newest");
        }
        if (to.isAfter(from.plusDays(365))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Date range must not exceed 366 days");
        }
    }

    private ExternalEventView toView(ExternalEventRow row) {
        return new ExternalEventView(
                row.id(),
                row.userId(),
                row.date(),
                firstNonBlank(row.externalCategory(), eventTypeToCategory(row.eventType())),
                row.title(),
                row.description(),
                row.workoutSport(),
                row.workoutDuration(),
                row.workoutTss(),
                row.workoutId(),
                row.externalUid(),
                row.externalId(),
                row.externalSource(),
                row.status()
        );
    }

    private record NormalizedEvent(
            LocalDate date,
            String category,
            String eventType,
            String title,
            String description,
            String type,
            Integer movingTime,
            BigDecimal trainingLoad,
            String uid,
            String externalId,
            String externalSource,
            String externalPayloadJson
    ) {
        ExternalEventDraft toDraft(UUID workoutId) {
            return new ExternalEventDraft(
                    date,
                    eventType,
                    workoutId,
                    title,
                    description,
                    category,
                    uid,
                    externalId,
                    externalSource,
                    externalPayloadJson
            );
        }
    }
}
