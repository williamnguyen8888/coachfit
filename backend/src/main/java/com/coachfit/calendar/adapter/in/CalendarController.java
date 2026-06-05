package com.coachfit.calendar.adapter.in;

import com.coachfit.calendar.adapter.in.dto.CalendarEventRequest;
import com.coachfit.calendar.adapter.in.dto.CalendarEventResponse;
import com.coachfit.calendar.adapter.in.dto.ReorderRequest;
import com.coachfit.calendar.adapter.in.dto.SkipRequest;
import com.coachfit.calendar.application.port.in.AnalyzeCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.CompleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.CreateCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.CreateCalendarEventUseCase.CreateCommand;
import com.coachfit.calendar.application.port.in.DeleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ReorderCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.SkipCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.UpdateCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.UpdateCalendarEventUseCase.UpdateCommand;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for the calendar module endpoints.
 *
 * <pre>
 * GET    /api/v1/calendar?from=...&to=...  — events in date range (flat list)
 * POST   /api/v1/calendar                  — create event
 * PUT    /api/v1/calendar/{id}             — update event fields
 * DELETE /api/v1/calendar/{id}             — soft delete
 * PUT    /api/v1/calendar/{id}/complete    — mark partial → completed
 * PUT    /api/v1/calendar/{id}/skip        — planned → skipped (or reverse)
 * POST   /api/v1/calendar/reorder         — reorder same-day events
 * </pre>
 *
 * <p>All endpoints require authentication. Ownership enforcement is in the service layer.
 *
 * <p>Coach assignment is out of scope for this ticket — {@code assignedBy} is always null.
 */
@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private final ListCalendarEventsUseCase  listUseCase;
    private final CreateCalendarEventUseCase createUseCase;
    private final UpdateCalendarEventUseCase updateUseCase;
    private final DeleteCalendarEventUseCase deleteUseCase;
    private final CompleteCalendarEventUseCase completeUseCase;
    private final SkipCalendarEventUseCase   skipUseCase;
    private final ReorderCalendarEventsUseCase reorderUseCase;
    private final com.coachfit.calendar.application.port.in.LinkActivityToCalendarEventUseCase linkActivityUseCase;
    private final AnalyzeCalendarEventUseCase analyzeUseCase;

    public CalendarController(
            ListCalendarEventsUseCase    listUseCase,
            CreateCalendarEventUseCase   createUseCase,
            UpdateCalendarEventUseCase   updateUseCase,
            DeleteCalendarEventUseCase   deleteUseCase,
            CompleteCalendarEventUseCase completeUseCase,
            SkipCalendarEventUseCase     skipUseCase,
            ReorderCalendarEventsUseCase reorderUseCase,
            com.coachfit.calendar.application.port.in.LinkActivityToCalendarEventUseCase linkActivityUseCase,
            AnalyzeCalendarEventUseCase  analyzeUseCase) {
        this.listUseCase       = listUseCase;
        this.createUseCase     = createUseCase;
        this.updateUseCase     = updateUseCase;
        this.deleteUseCase     = deleteUseCase;
        this.completeUseCase   = completeUseCase;
        this.skipUseCase       = skipUseCase;
        this.reorderUseCase    = reorderUseCase;
        this.linkActivityUseCase = linkActivityUseCase;
        this.analyzeUseCase    = analyzeUseCase;
    }

    // ── GET /calendar?from=...&to=... ─────────────────────────────────────────

    /**
     * Returns all calendar events in the given date range (inclusive, flat list).
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code from} — start date (ISO-8601, required)</li>
     *   <li>{@code to}   — end date   (ISO-8601, required)</li>
     * </ul>
     *
     * <p>Max range is limited to 366 days to avoid unbounded queries.
     */
    @GetMapping
    public ResponseEntity<List<CalendarEventResponse>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {

        validateDateRange(from, to);

        List<CalendarEventResponse> body = listUseCase.list(principal.getUserId(), from, to)
                .stream()
                .map(CalendarEventResponse::from)
                .toList();

        return ResponseEntity.ok(body);
    }

    // ── POST /calendar ────────────────────────────────────────────────────────

    /**
     * Creates a new calendar event for the authenticated user.
     *
     * <p>Validation:
     * <ul>
     *   <li>{@code date}, {@code eventType}, and {@code title} are required.</li>
     *   <li>{@code eventType} must be one of: workout, note, race, rest.</li>
     * </ul>
     * Returns 201 with a {@code Location} header pointing to the created resource.
     */
    @PostMapping
    public ResponseEntity<CalendarEventResponse> create(
            @RequestBody CalendarEventRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        validateRequest(req);

        UUID id = createUseCase.create(principal.getUserId(),
                new CreateCommand(req.date(), req.eventType(), req.title(),
                        req.description(), req.workoutId()));

        // Re-fetch to build the full response (consistent with PUT pattern)
        CalendarEventResponse body = listUseCase.list(principal.getUserId(), req.date(), req.date())
                .stream()
                .filter(v -> v.id().equals(id))
                .map(CalendarEventResponse::from)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Event created but not found"));

        return ResponseEntity
                .created(URI.create("/api/v1/calendar/" + id))
                .body(body);
    }

    // ── PUT /calendar/{id} ────────────────────────────────────────────────────

    /**
     * Updates the mutable fields of an existing calendar event.
     * Returns 200 with the updated event.
     *
     * <p>Note: status transitions (complete, skip) use dedicated sub-resource endpoints.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Void> update(
            @PathVariable UUID id,
            @RequestBody CalendarEventRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        validateRequest(req);

        updateUseCase.update(principal.getUserId(), id,
                new UpdateCommand(req.date(), req.eventType(), req.title(),
                        req.description(), req.workoutId()));

        return ResponseEntity.ok().build();
    }

    // ── DELETE /calendar/{id} ─────────────────────────────────────────────────

    /**
     * Soft-deletes a calendar event (sets {@code deleted_at}).
     * Returns 204 No Content on success.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        deleteUseCase.delete(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    // ── PUT /calendar/{id}/complete ───────────────────────────────────────────

    /**
     * Manually transitions a {@code partial} event to {@code completed}.
     *
     * <p>State machine: {@code partial} → {@code completed} only.
     * Returns 409 if the event is in any other state.
     */
    @PutMapping("/{id}/complete")
    public ResponseEntity<Void> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        completeUseCase.complete(principal.getUserId(), id);
        return ResponseEntity.ok().build();
    }

    // ── GET /calendar/{id}/analysis ──────────────────────────────────────────

    @GetMapping("/{id}/analysis")
    public ResponseEntity<AnalyzeCalendarEventUseCase.CalendarEventAnalysis> analyze(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        AnalyzeCalendarEventUseCase.CalendarEventAnalysis analysis = analyzeUseCase.analyze(principal.getUserId(), id);
        return ResponseEntity.ok(analysis);
    }

    // ── PUT /calendar/{id}/link-activity ─────────────────────────────────────
    @PutMapping("/{id}/link-activity")
    public ResponseEntity<Void> linkActivity(
            @PathVariable UUID id,
            @RequestParam UUID activityId,
            @AuthenticationPrincipal UserPrincipal principal) {
        linkActivityUseCase.link(principal.getUserId(), id, activityId);
        return ResponseEntity.ok().build();
    }

    // ── PUT /calendar/{id}/unlink-activity ───────────────────────────────────
    @PutMapping("/{id}/unlink-activity")
    public ResponseEntity<Void> unlinkActivity(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        linkActivityUseCase.unlink(principal.getUserId(), id);
        return ResponseEntity.ok().build();
    }

    // ── PUT /calendar/{id}/skip ───────────────────────────────────────────────

    /**
     * Marks a {@code planned} event as {@code skipped}.
     * When the optional body {@code { "unskip": true }} is present,
     * transitions a {@code skipped} event back to {@code planned}.
     *
     * <p>Returns 409 if the current state does not allow the transition.
     */
    @PutMapping("/{id}/skip")
    public ResponseEntity<Void> skip(
            @PathVariable UUID id,
            @RequestBody(required = false) SkipRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean unskip = req != null && req.unskip();
        skipUseCase.skip(principal.getUserId(), id, unskip);
        return ResponseEntity.ok().build();
    }

    // ── POST /calendar/reorder ────────────────────────────────────────────────

    /**
     * Reorders calendar events on the same day by reassigning {@code order_index}.
     *
     * <p>The client sends an ordered list of event IDs. Positions in the list
     * become the new {@code order_index} values (0-based).
     * Events not owned by the user are silently skipped.
     */
    @PostMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody ReorderRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (req == null || req.eventIds() == null || req.eventIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventIds must not be empty");
        }

        reorderUseCase.reorder(principal.getUserId(), req.eventIds());
        return ResponseEntity.ok().build();
    }
    // ── Validation helpers ────────────────────────────────────────────────────

    private static final List<String> VALID_EVENT_TYPES =
            List.of("workout", "note", "race", "rest");

    private static void validateRequest(CalendarEventRequest req) {
        if (req.date() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date is required");
        }
        if (req.eventType() == null || req.eventType().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventType is required");
        }
        if (!VALID_EVENT_TYPES.contains(req.eventType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "eventType must be one of: " + VALID_EVENT_TYPES);
        }
        if (req.title() == null || req.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        if (req.title().length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "title must not exceed 255 characters");
        }
    }

    private static void validateDateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'from' must not be after 'to'");
        }
        // ISSUE-06: plusDays(366).isBefore(to) was an off-by-one allowing 367-day ranges.
        // Correct: a range of exactly 366 days means to == from.plusDays(365), so we reject
        // anything where to is strictly after from.plusDays(365).
        if (to.isAfter(from.plusDays(365))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Date range must not exceed 366 days");
        }
    }
}
