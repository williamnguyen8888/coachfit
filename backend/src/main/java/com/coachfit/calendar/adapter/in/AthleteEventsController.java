package com.coachfit.calendar.adapter.in;

import com.coachfit.calendar.adapter.in.dto.AthleteEventDeleteRequest;
import com.coachfit.calendar.adapter.in.dto.AthleteEventRequest;
import com.coachfit.calendar.adapter.in.dto.AthleteEventResponse;
import com.coachfit.calendar.adapter.in.dto.DeleteEventsResponse;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.DoomedEvent;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.ExternalEventCommand;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.UpsertMode;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * External calendar events API for third-party workout imports.
 *
 * <pre>
 * GET    /api/v1/athlete/{id}/events?oldest=...&newest=...&category=WORKOUT
 * POST   /api/v1/athlete/{id}/events
 * POST   /api/v1/athlete/{id}/events/bulk?upsert=true
 * PUT    /api/v1/athlete/{id}/events/{eventId}
 * DELETE /api/v1/athlete/{id}/events/{eventId}
 * PUT    /api/v1/athlete/{id}/events/bulk-delete
 * DELETE /api/v1/athlete/{id}/events?oldest=...&newest=...&category=WORKOUT
 * </pre>
 *
 * <p>Like Intervals.icu, {@code athlete/0} resolves to the authenticated user.
 * Non-zero IDs are supported only when they match the authenticated user's UUID.
 */
@RestController
@RequestMapping("/api/v1/athlete/{athleteId}/events")
public class AthleteEventsController {

    private final ManageExternalCalendarEventsUseCase useCase;
    private final ObjectMapper objectMapper;

    public AthleteEventsController(ManageExternalCalendarEventsUseCase useCase,
                                   ObjectMapper objectMapper) {
        this.useCase = useCase;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<AthleteEventResponse>> list(
            @PathVariable String athleteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate oldest,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newest,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        LocalDate effectiveOldest = oldest != null ? oldest : LocalDate.now();
        List<AthleteEventResponse> body = useCase
                .list(userId, effectiveOldest, newest, splitParam(category), limit)
                .stream()
                .map(AthleteEventResponse::from)
                .toList();
        return ResponseEntity.ok(body);
    }

    @PostMapping
    public ResponseEntity<AthleteEventResponse> create(
            @PathVariable String athleteId,
            @RequestParam(required = false) Boolean upsert,
            @RequestParam(defaultValue = "false") boolean upsertOnUid,
            @RequestParam(required = false) String source,
            @RequestHeader(value = "X-CoachFit-Source", required = false) String sourceHeader,
            @RequestBody AthleteEventRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        var view = useCase.create(
                userId,
                resolveSource(source, sourceHeader),
                toCommand(request),
                upsertMode(upsert, upsertOnUid)
        );
        return ResponseEntity.ok(AthleteEventResponse.from(view));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<AthleteEventResponse>> bulkCreate(
            @PathVariable String athleteId,
            @RequestParam(defaultValue = "false") boolean upsert,
            @RequestParam(defaultValue = "false") boolean upsertOnUid,
            @RequestParam(defaultValue = "false") boolean updatePlanApplied,
            @RequestParam(required = false) String source,
            @RequestHeader(value = "X-CoachFit-Source", required = false) String sourceHeader,
            @RequestBody List<AthleteEventRequest> requests,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        List<ExternalEventCommand> commands = requests == null
                ? List.of()
                : requests.stream().map(this::toCommand).toList();
        List<AthleteEventResponse> body = useCase
                .bulkCreate(userId, resolveSource(source, sourceHeader), commands, upsertMode(upsert, upsertOnUid))
                .stream()
                .map(AthleteEventResponse::from)
                .toList();
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<AthleteEventResponse> update(
            @PathVariable String athleteId,
            @PathVariable UUID eventId,
            @RequestParam(required = false) String source,
            @RequestHeader(value = "X-CoachFit-Source", required = false) String sourceHeader,
            @RequestBody AthleteEventRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        var view = useCase.update(userId, eventId, resolveSource(source, sourceHeader), toCommand(request));
        return ResponseEntity.ok(AthleteEventResponse.from(view));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<DeleteEventsResponse> delete(
            @PathVariable String athleteId,
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        return ResponseEntity.ok(new DeleteEventsResponse(useCase.delete(userId, eventId)));
    }

    @PutMapping("/bulk-delete")
    public ResponseEntity<DeleteEventsResponse> bulkDelete(
            @PathVariable String athleteId,
            @RequestParam(required = false) String source,
            @RequestHeader(value = "X-CoachFit-Source", required = false) String sourceHeader,
            @RequestBody List<AthleteEventDeleteRequest> requests,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        List<DoomedEvent> doomed = requests == null
                ? List.of()
                : requests.stream().map(this::toDoomedEvent).toList();
        int deleted = useCase.bulkDelete(userId, resolveSource(source, sourceHeader), doomed);
        return ResponseEntity.ok(new DeleteEventsResponse(deleted));
    }

    @DeleteMapping
    public ResponseEntity<DeleteEventsResponse> deleteRange(
            @PathVariable String athleteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate oldest,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newest,
            @RequestParam List<String> category,
            @RequestParam(required = false) String source,
            @RequestHeader(value = "X-CoachFit-Source", required = false) String sourceHeader,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = resolveAthleteId(athleteId, principal);
        int deleted = useCase.deleteRange(
                userId,
                resolveSource(source, sourceHeader),
                oldest,
                newest,
                splitParam(category)
        );
        return ResponseEntity.ok(new DeleteEventsResponse(deleted));
    }

    private ExternalEventCommand toCommand(AthleteEventRequest request) {
        if (request == null) {
            throw new ResponseStatusException(BAD_REQUEST, "request body is required");
        }
        return new ExternalEventCommand(
                request.category(),
                request.startDateLocal(),
                request.date(),
                request.name(),
                request.description(),
                request.type(),
                request.movingTime(),
                request.timeTarget(),
                request.icuTrainingLoad(),
                request.loadTarget(),
                request.distance(),
                request.distanceTarget(),
                request.tags(),
                request.workoutId(),
                request.uid(),
                request.externalId(),
                request.filename(),
                request.fileContents(),
                request.fileContentsBase64(),
                request.steps(),
                request.workout(),
                request.workoutDoc(),
                objectMapper.valueToTree(request)
        );
    }

    private DoomedEvent toDoomedEvent(AthleteEventDeleteRequest request) {
        if (request == null) {
            return new DoomedEvent(null, null);
        }
        UUID id = null;
        if (request.id() != null && !request.id().isBlank()) {
            try {
                id = UUID.fromString(request.id().trim());
            } catch (Exception e) {
                throw new ResponseStatusException(BAD_REQUEST, "id must be a UUID");
            }
        }
        return new DoomedEvent(id, request.externalId());
    }

    private static UUID resolveAthleteId(String athleteId, UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(NOT_FOUND, "Athlete not found");
        }
        if ("0".equals(athleteId) || "me".equalsIgnoreCase(athleteId)) {
            return principal.getUserId();
        }
        UUID requested;
        try {
            requested = UUID.fromString(athleteId);
        } catch (Exception e) {
            throw new ResponseStatusException(BAD_REQUEST, "athlete id must be 0 or a user UUID");
        }
        if (!principal.getUserId().equals(requested)) {
            throw new ResponseStatusException(NOT_FOUND, "Athlete not found");
        }
        return requested;
    }

    private static String resolveSource(String source, String sourceHeader) {
        if (source != null && !source.isBlank()) {
            return source;
        }
        if (sourceHeader != null && !sourceHeader.isBlank()) {
            return sourceHeader;
        }
        return null;
    }

    private static UpsertMode upsertMode(Boolean upsert, boolean upsertOnUid) {
        if (Boolean.TRUE.equals(upsert)) {
            return UpsertMode.EXTERNAL_ID;
        }
        if (upsertOnUid) {
            return UpsertMode.UID;
        }
        return UpsertMode.NONE;
    }

    private static List<String> splitParam(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .flatMap(value -> Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }
}
