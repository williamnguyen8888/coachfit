package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.CompleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.CreateCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.DeleteCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ReorderCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.SkipCalendarEventUseCase;
import com.coachfit.calendar.application.port.in.UpdateCalendarEventUseCase;
import com.coachfit.calendar.application.port.out.AutoLinkActivityCandidate;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.CalendarEventSummary;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.ReorderEntry;
import com.coachfit.shared.domain.SportNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
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
                   ReorderCalendarEventsUseCase,
                   com.coachfit.calendar.application.port.in.LinkActivityToCalendarEventUseCase {

    private static final Logger log = LoggerFactory.getLogger(CalendarEventService.class);
    private static final BigDecimal RESCHEDULE_AUTO_LINK_MIN_SCORE = BigDecimal.valueOf(50);
    private static final BigDecimal RESCHEDULE_AUTO_LINK_MARGIN = BigDecimal.valueOf(15);

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
        CalendarEventSummary existing = findOwnedEvent(userId, eventId);
        boolean dateChanged = !existing.date().equals(command.date());
        boolean workoutChanged = !Objects.equals(existing.workoutId(), command.workoutId())
                || !Objects.equals(existing.eventType(), command.eventType());

        if (dateChanged && existing.activityId() != null && existing.workoutId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Standalone activity events cannot be rescheduled from the calendar");
        }

        boolean found = port.update(
                eventId, userId,
                command.date(), command.eventType(),
                command.title(), command.description(),
                command.workoutId()
        );
        if (!found) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Calendar event not found");
        }

        if (dateChanged) {
            if (existing.activityId() != null) {
                port.unlinkActivity(eventId);
                port.createStandaloneActivityEvent(
                        userId,
                        existing.date(),
                        existing.activityId(),
                        existing.activityName(),
                        existing.activitySport()
                );
                log.info("Moved event {} to {}. Unlinked activity {} and orphaned it back to old date {}.",
                        eventId, command.date(), existing.activityId(), existing.date());
            }
            if ("skipped".equals(existing.status())) {
                port.updateStatus(eventId, userId, "planned");
            }
            CalendarEventSummary updated = findOwnedEvent(userId, eventId);
            autoLinkAfterReschedule(userId, updated);
        } else if (workoutChanged && existing.activityId() != null) {
            CalendarEventSummary updated = findOwnedEvent(userId, eventId);
            if ("workout".equals(updated.eventType()) && updated.workoutId() != null) {
                var activityDetails = port.findActivityDetails(userId, existing.activityId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found"));
                if (updated.workoutSport() != null && activityDetails.sport() != null
                        && !SportNormalizer.sameSport(updated.workoutSport(), activityDetails.sport())) {
                    port.unlinkActivity(eventId);
                    port.createStandaloneActivityEvent(
                            userId,
                            existing.date(),
                            existing.activityId(),
                            existing.activityName(),
                            existing.activitySport()
                    );
                } else {
                    BigDecimal complianceScore = calculateComplianceScore(
                            updated.workoutDuration(), activityDetails.durationSeconds());
                    port.linkActivity(eventId, userId, existing.activityId(), complianceScore);
                }
            } else {
                port.unlinkActivity(eventId);
                port.createStandaloneActivityEvent(
                        userId,
                        existing.date(),
                        existing.activityId(),
                        existing.activityName(),
                        existing.activitySport()
                );
            }
        } else {
            CalendarEventSummary updated = findOwnedEvent(userId, eventId);
            autoLinkAfterReschedule(userId, updated);
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

    // ── LinkActivityToCalendarEventUseCase ────────────────────────────────────

    @Override
    @Transactional
    public void link(UUID userId, UUID eventId, UUID activityId) {
        CalendarEventSummary event = findOwnedEvent(userId, eventId);

        // Fetch activity details (duration, sport)
        if (!"workout".equals(event.eventType()) || event.workoutId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only workout events can be linked to activities");
        }

        var activityDetails = port.findActivityDetails(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found"));

        if (event.workoutSport() != null && activityDetails.sport() != null
                && !SportNormalizer.sameSport(event.workoutSport(), activityDetails.sport())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Activity sport does not match the workout sport");
        }

        BigDecimal complianceScore = calculateComplianceScore(
                event.workoutDuration(), activityDetails.durationSeconds());
        port.linkActivity(eventId, userId, activityId, complianceScore);
        if (event.activityId() != null && !event.activityId().equals(activityId)) {
            port.createStandaloneActivityEvent(
                    userId,
                    event.date(),
                    event.activityId(),
                    event.activityName(),
                    event.activitySport()
            );
        }
        log.info("Manually linked activity {} to calendar event {} by user {}", activityId, eventId, userId);
    }

    @Override
    @Transactional
    public void unlink(UUID userId, UUID eventId) {
        CalendarEventSummary event = findOwnedEvent(userId, eventId);

        if (event.activityId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Calendar event is not linked to any activity");
        }

        if (event.workoutId() == null) {
            port.softDelete(eventId);
        } else {
            port.unlinkActivity(eventId);
            port.createStandaloneActivityEvent(
                    userId,
                    event.date(),
                    event.activityId(),
                    event.activityName(),
                    event.activitySport()
            );
        }
        log.info("Manually unlinked activity from calendar event {} by user {}", eventId, userId);
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

    private static BigDecimal calculateComplianceScore(Integer plannedDuration, int actualDuration) {
        if (plannedDuration == null || plannedDuration <= 0) {
            return BigDecimal.valueOf(100.0);
        }

        double ratio = (double) actualDuration / plannedDuration;
        if (ratio >= 0.9 && ratio <= 1.1) {
            return BigDecimal.valueOf(100.0);
        }
        if (ratio < 0.9) {
            return BigDecimal.valueOf(Math.max(0.0, 100.0 * (ratio / 0.9)))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(Math.max(0.0, 100.0 * (1.0 - (ratio - 1.1))))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void autoLinkAfterReschedule(UUID userId, CalendarEventSummary event) {
        if (!"workout".equals(event.eventType())
                || event.workoutId() == null
                || event.activityId() != null
                || event.workoutSport() == null) {
            return;
        }

        List<AutoLinkActivityCandidate> candidates = port.findAutoLinkActivityCandidates(userId, event.date())
                .stream()
                .filter(candidate -> SportNormalizer.sameSport(event.workoutSport(), candidate.sport()))
                .toList();
        if (candidates.isEmpty()) {
            return;
        }

        AutoLinkActivityCandidate best = null;
        BigDecimal bestScore = null;
        BigDecimal secondBestScore = null;

        for (AutoLinkActivityCandidate candidate : candidates) {
            BigDecimal score = calculateComplianceScore(event.workoutDuration(), candidate.durationSeconds());
            if (bestScore == null || score.compareTo(bestScore) > 0) {
                secondBestScore = bestScore;
                bestScore = score;
                best = candidate;
            } else if (secondBestScore == null || score.compareTo(secondBestScore) > 0) {
                secondBestScore = score;
            }
        }

        if (best == null || bestScore.compareTo(RESCHEDULE_AUTO_LINK_MIN_SCORE) < 0) {
            return;
        }
        if (secondBestScore != null
                && bestScore.subtract(secondBestScore).compareTo(RESCHEDULE_AUTO_LINK_MARGIN) < 0) {
            log.info("Skipped reschedule auto-link for event {} on {} because {} candidates were ambiguous",
                    event.id(), event.date(), candidates.size());
            return;
        }

        port.linkActivity(event.id(), userId, best.id(), bestScore);
        log.info("Auto-linked rescheduled workout event {} to standalone activity {} with compliance={}%",
                event.id(), best.id(), bestScore);
    }

    /**
     * Maps the persistence summary to the API read model.
     * Workout and activity nested objects are resolved by the controller layer
     * (currently passed as null — enrichment deferred to a future cross-module join).
     */
    private CalendarEventView toView(CalendarEventSummary s) {
        WorkoutSummary workout = null;
        if (s.workoutId() != null) {
            Double distance = null;
            java.math.BigDecimal tss = s.workoutTss();
            if (s.workoutSteps() != null && !s.workoutSteps().isBlank()) {
                var calc = com.coachfit.shared.domain.workout.WorkoutCalculator.calculate(s.workoutSteps(), s.workoutSport());
                distance = calc.distanceMeters();
                if (tss == null || tss.compareTo(java.math.BigDecimal.ZERO) == 0) {
                    tss = calc.tss();
                }
            }
            workout = new WorkoutSummary(s.workoutId(), s.workoutSport(), s.workoutDuration(), tss, distance);
        }
        ActivitySummary activity = s.activityId() != null
                ? new ActivitySummary(
                        s.activityId(),
                        s.activityTss() != null ? s.activityTss().doubleValue() : null,
                        s.activityDuration(),
                        s.activitySport(),
                        s.activityName(),
                        s.activityDistance() != null ? s.activityDistance().doubleValue() : null,
                        s.activityAvgHr(),
                        s.activityMaxHr(),
                        s.activityAvgPower(),
                        s.activitySource()
                  )
                : null;

        return new CalendarEventView(
                s.id(),
                s.date(),
                s.eventType(),
                s.title(),
                s.description(),
                s.status(),
                s.orderIndex(),
                s.complianceScore(),
                workout,
                activity
        );
    }
}
