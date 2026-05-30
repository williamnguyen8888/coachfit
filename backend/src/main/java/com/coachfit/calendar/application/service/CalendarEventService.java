package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.CompleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.CreateCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.DeleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ReorderCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.SkipCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.UpdateCalendarEventUseCase;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.CalendarEventSummary;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.ReorderEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

/**
 * Application service implementing all calendar event use cases.
 *
 * <p><strong>State machine (from docs/05-api-design.md):</strong>
 * <pre>
 *   planned   → completed : activity linked (compliance ≥ 50%)      [linkActivity]
 *   planned   → partial   : activity linked (compliance < 50%)       [linkActivity]
 *   planned   → skipped   : user/coach explicit skip OR auto-skip    [skip]
 *   completed → planned   : linked activity deleted                  [internal]
 *   partial   → completed : manual override                          [complete]
 *   partial   → planned   : linked activity deleted                  [internal]
 *   skipped   → planned   : user un-skips                            [skip(unskip=true)]
 * </pre>
 *
 * <p>Ownership is enforced at every mutating query; userId is always included
 * in WHERE clauses so a user can never modify another user's events.
 */
@Service
public class CalendarEventService
        implements ListCalendarEventsUseCase,
                   CreateCalendarEventUseCase,
                   UpdateCalendarEventUseCase,
                   DeleteCalendarEventUseCase,
                   CompleteCalendarEventUseCase,
                   SkipCalendarEventUseCase,
                   ReorderCalendarEventsUseCase {

    private static final Logger log = LoggerFactory.getLogger(CalendarEventService.class);

    private final CalendarEventPersistencePort port;

    public CalendarEventService(CalendarEventPersistencePort port) {
        this.port = port;
    }

    // ── ListCalendarEventsUseCase ─────────────────────────────────────────────

    @Override
    public List<CalendarEventView> list(UUID userId, LocalDate from, LocalDate to) {
        return port.findByUserAndDateRange(userId, from, to)
                .stream()
                .map(this::toView)
                .toList();
    }

    // ── CreateCalendarEventUseCase ────────────────────────────────────────────

    @Override
    @Transactional
    public UUID create(UUID userId, CreateCommand command) {
        UUID id = port.save(
                userId,
                command.date(),
                command.eventType(),
                command.workoutId(),
                command.title(),
                command.description()
        );
        log.info("Calendar event created: id={} user={} date={} type={}",
                id, userId, command.date(), command.eventType());
        return id;
    }

    // ── UpdateCalendarEventUseCase ────────────────────────────────────────────

    @Override
    @Transactional
    public void update(UUID userId, UUID eventId, UpdateCommand command) {
        boolean found = port.update(
                eventId, userId,
                command.date(), command.eventType(),
                command.title(), command.description(),
                command.workoutId()
        );
        if (!found) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        log.debug("Calendar event updated: id={} user={}", eventId, userId);
    }

    // ── DeleteCalendarEventUseCase ────────────────────────────────────────────

    @Override
    @Transactional
    public void delete(UUID userId, UUID eventId) {
        // Verify ownership before deleting
        CalendarEventSummary event = findOwnedEvent(userId, eventId);
        port.softDelete(event.id());
        log.info("Calendar event soft-deleted: id={} user={}", eventId, userId);
    }

    // ── CompleteCalendarEventUseCase ──────────────────────────────────────────

    /**
     * Transitions {@code partial} → {@code completed}.
     * Per the state machine: only partial events can be manually completed.
     */
    @Override
    @Transactional
    public void complete(UUID userId, UUID eventId) {
        CalendarEventSummary event = findOwnedEvent(userId, eventId);

        if (!"partial".equals(event.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only partial events can be manually completed; current status: " + event.status());
        }

        boolean updated = port.updateStatus(eventId, userId, "completed");
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        log.info("Calendar event manually completed: id={} user={}", eventId, userId);
    }

    // ── SkipCalendarEventUseCase ──────────────────────────────────────────────

    /**
     * {@code planned} → {@code skipped} or {@code skipped} → {@code planned} (un-skip).
     */
    @Override
    @Transactional
    public void skip(UUID userId, UUID eventId, boolean unskip) {
        CalendarEventSummary event = findOwnedEvent(userId, eventId);

        if (unskip) {
            // skipped → planned
            if (!"skipped".equals(event.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Only skipped events can be un-skipped; current status: " + event.status());
            }
            port.updateStatus(eventId, userId, "planned");
            log.info("Calendar event un-skipped: id={} user={}", eventId, userId);
        } else {
            // planned → skipped
            if (!"planned".equals(event.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Only planned events can be skipped; current status: " + event.status());
            }
            port.updateStatus(eventId, userId, "skipped");
            log.info("Calendar event skipped: id={} user={}", eventId, userId);
        }
    }

    // ── ReorderCalendarEventsUseCase ──────────────────────────────────────────

    @Override
    @Transactional
    public void reorder(UUID userId, List<UUID> eventIds) {
        List<ReorderEntry> entries = IntStream.range(0, eventIds.size())
                .mapToObj(i -> new ReorderEntry(eventIds.get(i), (short) i))
                .toList();
        port.reorder(userId, entries);
        log.debug("Calendar events reordered: user={} count={}", userId, eventIds.size());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Loads a calendar event and verifies it belongs to the given user.
     * Throws 404 if not found or belongs to another user.
     */
    private CalendarEventSummary findOwnedEvent(UUID userId, UUID eventId) {
        CalendarEventSummary event = port.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Calendar event not found"));

        if (!userId.equals(event.userId())) {
            // Return 404 to avoid user enumeration
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }
        return event;
    }

    /**
     * Maps the persistence summary to the API read model.
     * Workout and activity nested objects are resolved by the controller layer
     * (currently passed as null — enrichment deferred to a future cross-module join).
     */
    private CalendarEventView toView(CalendarEventSummary s) {
        return new CalendarEventView(
                s.id(),
                s.date(),
                s.eventType(),
                s.title(),
                s.description(),
                s.status(),
                s.orderIndex(),
                s.complianceScore(),
                null,   // WorkoutSummary — enriched at controller layer if needed
                null    // ActivitySummary — enriched at controller layer if needed
        );
    }
}
