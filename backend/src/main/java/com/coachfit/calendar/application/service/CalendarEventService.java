package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.AnalyzeCalendarEventUseCase;
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
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.ActivityStreamData;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.UserSportZones;
import com.coachfit.shared.domain.SportNormalizer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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
                   com.coachfit.calendar.application.port.in.LinkActivityToCalendarEventUseCase,
                   AnalyzeCalendarEventUseCase {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Logger log = LoggerFactory.getLogger(CalendarEventService.class);
    private static final BigDecimal RESCHEDULE_AUTO_LINK_MIN_SCORE = BigDecimal.valueOf(50);
    private static final BigDecimal RESCHEDULE_AUTO_LINK_MARGIN = BigDecimal.valueOf(15);

    private final CalendarEventPersistencePort port;
    private final org.springframework.context.MessageSource messageSource;
    private record AnalysisCacheKey(UUID eventId, java.util.Locale locale) {}
    private final Map<AnalysisCacheKey, CalendarEventAnalysis> analysisCache = new ConcurrentHashMap<>();

    public CalendarEventService(CalendarEventPersistencePort port, org.springframework.context.MessageSource messageSource) {
        this.port = port;
        this.messageSource = messageSource;
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
                    try {
                        CalendarEventSummary updatedEvent = findOwnedEvent(userId, eventId);
                        if (updatedEvent.workoutId() != null && updatedEvent.activityId() != null) {
                            analyze(userId, eventId);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to calculate precise compliance score after workout update link: {}", e.getMessage());
                    }
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
            // ISSUE-05: Only auto-link when the date changed (handled above).
            // Previously autoLinkAfterReschedule was also called on title/description-only
            // updates, which could unexpectedly attach activities. Now we just no-op.
            log.debug("Calendar event updated without date/workout change; no auto-link attempted: id={}", eventId);
        }

        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
        log.debug("Calendar event updated: id={} user={}", eventId, userId);
    }

    // ── DeleteCalendarEventUseCase ────────────────────────────────────────────

    @Override
    @Transactional
    public void delete(UUID userId, UUID eventId) {
        // Verify ownership before deleting
        CalendarEventSummary event = findOwnedEvent(userId, eventId);
        port.softDelete(event.id());
        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
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
        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
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
        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
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
        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
        try {
            CalendarEventSummary updatedEvent = findOwnedEvent(userId, eventId);
            if (updatedEvent.workoutId() != null && updatedEvent.activityId() != null) {
                analyze(userId, eventId);
            }
        } catch (Exception e) {
            log.warn("Failed to calculate precise compliance score after manual link: {}", e.getMessage());
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
        analysisCache.keySet().removeIf(key -> key.eventId().equals(eventId));
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
            // BUG-04: Clamp to [0, 100] — ratio/0.9 is always < 1 here so this is safe,
            // but we add Math.min for defensive correctness.
            return BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, 100.0 * (ratio / 0.9))))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        // ratio > 1.1 case: can produce > 100 when ratio is between 1.09 and 1.1 due to
        // floating-point edge; clamp explicitly.
        return BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, 100.0 * (1.0 - (ratio - 1.1)))))
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
        try {
            CalendarEventSummary updatedEvent = findOwnedEvent(userId, event.id());
            if (updatedEvent.workoutId() != null && updatedEvent.activityId() != null) {
                analyze(userId, event.id());
            }
        } catch (Exception e) {
            log.warn("Failed to calculate precise compliance score after auto link: {}", e.getMessage());
        }
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

    // ── AnalyzeCalendarEventUseCase ───────────────────────────────────────────

    @Override
    @Transactional
    public CalendarEventAnalysis analyze(UUID userId, UUID eventId) {
        java.util.Locale locale = org.springframework.context.i18n.LocaleContextHolder.getLocale();
        AnalysisCacheKey cacheKey = new AnalysisCacheKey(eventId, locale);
        return analysisCache.computeIfAbsent(cacheKey, key -> {
            CalendarEventSummary event = findOwnedEvent(userId, eventId);

            if (event.workoutId() == null || event.activityId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Calendar event must have both a planned workout and an actual activity linked to be analyzed");
            }

        String sport = event.workoutSport() != null ? event.workoutSport() : "other";

        // 1. Resolve athlete zones
        UserSportZones zones = port.findUserSportZones(userId, sport, event.date()).orElse(null);
        int ftp = (zones != null && zones.ftp() != null) ? zones.ftp() : 250;
        int lthr = (zones != null && zones.lthr() != null) ? zones.lthr() : 165;
        int maxHr = (zones != null && zones.maxHr() != null) ? zones.maxHr() : 185;
        String zonesJson = zones != null ? zones.zonesJson() : null;

        // 2. Flatten planned workout steps
        List<FlatStep> flatSteps = new ArrayList<>();
        if (event.workoutSteps() != null && !event.workoutSteps().isBlank()) {
            try {
                JsonNode stepsNode = MAPPER.readTree(event.workoutSteps());
                flattenSteps(stepsNode, sport, flatSteps);
            } catch (Exception e) {
                log.warn("Failed to parse workout steps JSON for analysis: {}", e.getMessage());
            }
        }

        // Fallback: If no steps were parsed but we have a duration, create one default step
        if (flatSteps.isEmpty()) {
            FlatStep fs = new FlatStep();
            fs.name = event.title();
            fs.type = "work";
            fs.duration = event.workoutDuration() != null ? event.workoutDuration() : 3600;
            fs.distance = 0.0;
            fs.targetType = "open";
            flatSteps.add(fs);
        }

        // Calculate total planned duration
        int totalPlannedDuration = flatSteps.stream().mapToInt(s -> s.duration).sum();

        // 3. Fetch activity stream
        ActivityStreamData stream = port.findActivityStream(event.activityId()).orElse(null);

        // 4. Slice streams or fallback
        List<StepAnalysis> stepAnalyses = new ArrayList<>();
        double totalWeightedStepCompliance = 0.0;
        double totalPlannedWeight = 0.0;

        int streamLen = (stream != null && stream.timestamps() != null) ? stream.timestamps().length : 0;
        int currentStreamIdx = 0;
        int cumulativePlannedSeconds = 0;

        for (int i = 0; i < flatSteps.size(); i++) {
            FlatStep plan = flatSteps.get(i);
            cumulativePlannedSeconds += plan.duration;

            int actualDuration = 0;
            double actualDistance = 0.0;
            int actualAvgHr = 0;
            int actualAvgPower = 0;
            double actualAvgSpeed = 0.0;

            if (streamLen > 0 && currentStreamIdx < streamLen) {
                // Find stream indices for this slice
                int startIdx = currentStreamIdx;
                int endIdx = startIdx;
                while (endIdx < streamLen && stream.timestamps()[endIdx] <= cumulativePlannedSeconds) {
                    endIdx++;
                }
                if (endIdx > startIdx) {
                    int count = endIdx - startIdx;
                    actualDuration = stream.timestamps()[endIdx - 1] - stream.timestamps()[startIdx];
                    if (actualDuration <= 0 && count > 0) {
                        actualDuration = plan.duration;
                    }

                    // Distance
                    if (stream.distance() != null && stream.distance().length > 0) {
                        float distStart = stream.distance()[startIdx];
                        float distEnd = stream.distance()[Math.min(endIdx - 1, stream.distance().length - 1)];
                        actualDistance = distEnd - distStart;
                    }

                    // HR
                    long hrSum = 0;
                    int hrCount = 0;
                    if (stream.heartRate() != null && stream.heartRate().length > 0) {
                        for (int k = startIdx; k < endIdx; k++) {
                            if (k < stream.heartRate().length && stream.heartRate()[k] > 0) {
                                hrSum += stream.heartRate()[k];
                                hrCount++;
                            }
                        }
                    }
                    actualAvgHr = hrCount > 0 ? (int) (hrSum / hrCount) : 0;

                    // Power
                    long pwrSum = 0;
                    int pwrCount = 0;
                    if (stream.power() != null && stream.power().length > 0) {
                        for (int k = startIdx; k < endIdx; k++) {
                            if (k < stream.power().length && stream.power()[k] > 0) {
                                pwrSum += stream.power()[k];
                                pwrCount++;
                            }
                        }
                    }
                    actualAvgPower = pwrCount > 0 ? (int) (pwrSum / pwrCount) : 0;

                    // Speed
                    double speedSum = 0.0;
                    int speedCount = 0;
                    if (stream.speed() != null && stream.speed().length > 0) {
                        for (int k = startIdx; k < endIdx; k++) {
                            if (k < stream.speed().length) {
                                speedSum += stream.speed()[k];
                                speedCount++;
                            }
                        }
                    }
                    actualAvgSpeed = speedCount > 0 ? (speedSum / speedCount) : 0.0;

                    currentStreamIdx = endIdx;
                } else {
                    actualDuration = 0;
                    actualDistance = 0.0;
                    actualAvgHr = 0;
                    actualAvgPower = 0;
                    actualAvgSpeed = 0.0;
                }
            } else {
                // FALLBACK: Partition overall values proportionally
                double pct = totalPlannedDuration > 0 ? (double) plan.duration / totalPlannedDuration : (1.0 / flatSteps.size());
                int overallDuration = event.activityDuration() != null ? event.activityDuration() : 0;
                actualDuration = (int) Math.round(overallDuration * pct);

                double overallDistance = event.activityDistance() != null ? event.activityDistance().doubleValue() : 0.0;
                actualDistance = overallDistance * pct;

                actualAvgHr = event.activityAvgHr() != null ? event.activityAvgHr() : 0;
                actualAvgPower = event.activityAvgPower() != null ? event.activityAvgPower() : 0;
                if (actualDuration > 0) {
                    actualAvgSpeed = actualDistance / actualDuration;
                }
            }

            // Resolve target boundaries for evaluation
            double tgtMin = plan.targetMin;
            double tgtMax = plan.targetMax;
            String targetValueStr = "Open";

            if ("power_zone".equals(plan.targetType)) {
                ZoneRange bounds = getZoneBounds(zonesJson, plan.targetZone);
                if (bounds == null) {
                    bounds = getDefaultPowerZonePct(plan.targetZone);
                }
                tgtMin = (bounds.min() / 100.0) * ftp;
                tgtMax = (bounds.max() / 100.0) * ftp;
                targetValueStr = String.format("%d-%dW", (int) Math.round(tgtMin), (int) Math.round(tgtMax));
            } else if ("hr_zone".equals(plan.targetType)) {
                ZoneRange bounds = getZoneBounds(zonesJson, plan.targetZone);
                if (bounds == null) {
                    bounds = getDefaultHrZonePct(plan.targetZone);
                }
                tgtMin = (bounds.min() / 100.0) * lthr;
                tgtMax = (bounds.max() / 100.0) * lthr;
                targetValueStr = String.format("%d-%dbpm", (int) Math.round(tgtMin), (int) Math.round(tgtMax));
            } else if ("power_pct".equals(plan.targetType)) {
                tgtMin = plan.targetMin * ftp;
                tgtMax = plan.targetMax * ftp;
                targetValueStr = String.format("%d-%dW", (int) Math.round(tgtMin), (int) Math.round(tgtMax));
            } else if ("hr_pct".equals(plan.targetType)) {
                tgtMin = plan.targetMin * maxHr;
                tgtMax = plan.targetMax * maxHr;
                targetValueStr = String.format("%d-%dbpm", (int) Math.round(tgtMin), (int) Math.round(tgtMax));
            } else if ("power_watts".equals(plan.targetType)) {
                tgtMin = plan.targetMin;
                tgtMax = plan.targetMax;
                targetValueStr = String.format("%d-%dW", (int) tgtMin, (int) tgtMax);
            } else if ("hr_bpm".equals(plan.targetType)) {
                tgtMin = plan.targetMin;
                tgtMax = plan.targetMax;
                targetValueStr = String.format("%d-%dbpm", (int) tgtMin, (int) tgtMax);
            } else if ("pace".equals(plan.targetType)) {
                targetValueStr = String.format("%s-%s/km", formatPaceSecs(plan.targetMax), formatPaceSecs(plan.targetMin));
            } else if ("rpe".equals(plan.targetType)) {
                targetValueStr = String.format("RPE %.0f-%.0f", plan.targetMin, plan.targetMax);
            } else if ("cadence".equals(plan.targetType)) {
                targetValueStr = String.format("%.0f-%.0f rpm", plan.targetMin, plan.targetMax);
            }

            // A. Duration Compliance
            BigDecimal durComp = calculateStepDurationCompliance(plan.duration, actualDuration);

            // B. Intensity Compliance
            BigDecimal intComp = BigDecimal.valueOf(100.0);
            if (isIntensityTarget(plan.targetType)) {
                if (plan.targetType.startsWith("power") || plan.targetType.equals("power_zone")) {
                    intComp = calculateStepIntensityCompliance(tgtMin, tgtMax, actualAvgPower);
                } else if (plan.targetType.startsWith("hr") || plan.targetType.equals("hr_zone")) {
                    intComp = calculateStepIntensityCompliance(tgtMin, tgtMax, actualAvgHr);
                } else if (plan.targetType.equals("pace")) {
                    double speedMin = plan.targetMax > 0 ? (1000.0 / plan.targetMax) : 0.0;
                    double speedMax = plan.targetMin > 0 ? (1000.0 / plan.targetMin) : 999.0;
                    intComp = calculateStepIntensityCompliance(speedMin, speedMax, actualAvgSpeed);
                }
            }

            // C. Combined Step Compliance
            BigDecimal stepComp;
            if (isIntensityTarget(plan.targetType)) {
                stepComp = BigDecimal.valueOf(0.60).multiply(durComp)
                        .add(BigDecimal.valueOf(0.40).multiply(intComp))
                        .setScale(2, RoundingMode.HALF_UP);
            } else {
                stepComp = durComp;
            }

            boolean isTargetMet = stepComp.compareTo(BigDecimal.valueOf(75.0)) >= 0;
            String actualAvgPaceStr = formatSpeedToPaceStr(actualAvgSpeed, sport);

            Integer hrr = null;
            if ("work".equals(plan.type) && i + 1 < flatSteps.size()) {
                FlatStep nextPlan = flatSteps.get(i + 1);
                if ("rest".equals(nextPlan.type) || "recovery".equals(nextPlan.type)) {
                    int endWorkTime = cumulativePlannedSeconds;
                    int recoveryTime = Math.min(endWorkTime + 60, endWorkTime + nextPlan.duration);
                    int hrAtEnd = getHeartRateAtSecond(stream, endWorkTime);
                    int hrAtRecovery = getHeartRateAtSecond(stream, recoveryTime);
                    if (hrAtEnd > 0 && hrAtRecovery > 0) {
                        hrr = hrAtEnd - hrAtRecovery;
                    }
                }
            }

            stepAnalyses.add(new StepAnalysis(
                    i + 1,
                    plan.type,
                    plan.name,
                    plan.targetType,
                    targetValueStr,
                    plan.duration,
                    plan.distance,
                    actualDuration,
                    actualDistance,
                    actualAvgHr,
                    actualAvgPower,
                    actualAvgSpeed,
                    actualAvgPaceStr,
                    durComp,
                    intComp,
                    stepComp,
                    isTargetMet,
                    hrr
            ));

            totalWeightedStepCompliance += stepComp.doubleValue() * plan.duration;
            totalPlannedWeight += plan.duration;
        }

        // Calculate Overall Match compliance
        double overallScoreDouble = totalPlannedWeight > 0 ? (totalWeightedStepCompliance / totalPlannedWeight) : 100.0;
        BigDecimal overallScore = BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, overallScoreDouble)))
                .setScale(2, RoundingMode.HALF_UP);

        // Update compliance score in database to synchronize UI
        port.linkActivity(eventId, userId, event.activityId(), overallScore);

        // Summaries
        Integer actDuration = event.activityDuration();
        Double actDistance = event.activityDistance() != null ? event.activityDistance().doubleValue() : null;

        double plannedDistTotal = flatSteps.stream().mapToDouble(s -> s.distance).sum();
        if (plannedDistTotal <= 0 && totalPlannedDuration > 0) {
            plannedDistTotal = getHeuristicDistance(totalPlannedDuration, sport);
        }

        BigDecimal durSummaryComp = calculateStepDurationCompliance(totalPlannedDuration, actDuration != null ? actDuration : 0);
        BigDecimal distSummaryComp = BigDecimal.valueOf(100.0);
        if (plannedDistTotal > 0 && actDistance != null) {
            distSummaryComp = calculateStepDurationCompliance((int) Math.round(plannedDistTotal), (int) Math.round(actDistance));
        }

        BigDecimal plannedTss = event.workoutTss() != null ? event.workoutTss() : BigDecimal.ZERO;
        BigDecimal actualTss = event.activityTss() != null ? event.activityTss() : BigDecimal.ZERO;
        BigDecimal tssCompliance = BigDecimal.valueOf(100.0);
        if (plannedTss.compareTo(BigDecimal.ZERO) > 0) {
            tssCompliance = calculateStepDurationCompliance(plannedTss.intValue(), actualTss.intValue());
        }

        // Zone Distribution analysis (Planned vs Actual zones 1-5)
        List<ZoneDistributionMatch> zoneMatches = new ArrayList<>();
        double[] plannedZoneSeconds = new double[6];
        double[] actualZoneSeconds = new double[6];
        double totalPlannedZoneTime = 0;
        double totalActualZoneTime = 0;

        // BUG-05: Use targetZone from the original flatSteps list (by stepNumber index)
        // instead of parsing targetValueStr, which contains "200-250W" / "145-165bpm" format
        // and never has a "Zone N" prefix. Step numbers are 1-based.
        for (StepAnalysis sa : stepAnalyses) {
            int stepIdx = sa.stepNumber() - 1; // sa.stepNumber() is 1-based
            int saZone = 2; // default to zone 2 (aerobic) for non-zone targets
            if (sa.targetType().contains("zone") && stepIdx >= 0 && stepIdx < flatSteps.size()) {
                int plannedZone = flatSteps.get(stepIdx).targetZone;
                if (plannedZone >= 1 && plannedZone <= 5) {
                    saZone = plannedZone;
                }
            }
            if (saZone >= 1 && saZone <= 5) {
                plannedZoneSeconds[saZone] += sa.plannedDuration();
                totalPlannedZoneTime += sa.plannedDuration();
            }

            int actZone = 2;
            if (sa.actualAvgPower() > 0) {
                actZone = estimateZoneForValue(sa.actualAvgPower(), ftp, "power", zonesJson);
            } else if (sa.actualAvgHr() > 0) {
                actZone = estimateZoneForValue(sa.actualAvgHr(), lthr, "hr", zonesJson);
            }
            if (actZone >= 1 && actZone <= 5) {
                actualZoneSeconds[actZone] += sa.actualDuration();
                totalActualZoneTime += sa.actualDuration();
            }
        }

        String[] zoneNames = {"", "Recovery", "Aerobic", "Tempo", "Threshold", "VO2 Max"};
        for (int z = 1; z <= 5; z++) {
            double pPct = totalPlannedZoneTime > 0 ? (plannedZoneSeconds[z] / totalPlannedZoneTime) * 100.0 : 0.0;
            double aPct = totalActualZoneTime > 0 ? (actualZoneSeconds[z] / totalActualZoneTime) * 100.0 : 0.0;
            zoneMatches.add(new ZoneDistributionMatch(
                    z,
                    zoneNames[z],
                    BigDecimal.valueOf(pPct).setScale(1, RoundingMode.HALF_UP).doubleValue(),
                    BigDecimal.valueOf(aPct).setScale(1, RoundingMode.HALF_UP).doubleValue()
            ));
        }

        SummaryComparison summary = new SummaryComparison(
                totalPlannedDuration,
                actDuration,
                durSummaryComp,
                plannedDistTotal,
                actDistance,
                distSummaryComp,
                plannedTss,
                actualTss,
                tssCompliance,
                70,
                event.activityAvgPower() != null ? event.activityAvgPower() : 70,
                BigDecimal.valueOf(100.0)
        );
            return new CalendarEventAnalysis(
                    eventId,
                    event.workoutId(),
                    event.activityId(),
                    event.title(),
                    sport,
                    overallScore,
                    summary,
                    stepAnalyses,
                    new MetricsAnalysis(zoneMatches)
            );
        });
    }

    private void flattenSteps(JsonNode stepsNode, String defaultSport, List<FlatStep> output) {
        if (stepsNode == null || !stepsNode.isArray()) return;
        for (JsonNode step : stepsNode) {
            String type = step.has("type") ? step.get("type").asText() : "work";
            if ("repeat".equals(type)) {
                int count = step.has("count") ? step.get("count").asInt() : 1;
                if (step.has("steps") && step.get("steps").isArray()) {
                    for (int r = 0; r < count; r++) {
                        List<FlatStep> repeatList = new ArrayList<>();
                        flattenSteps(step.get("steps"), defaultSport, repeatList);
                        for (FlatStep fs : repeatList) {
                            FlatStep copy = new FlatStep();
                            copy.name = fs.name + String.format(" (%d/%d)", r + 1, count);
                            copy.type = fs.type;
                            copy.duration = fs.duration;
                            copy.distance = fs.distance;
                            copy.targetType = fs.targetType;
                            copy.targetZone = fs.targetZone;
                            copy.targetMin = fs.targetMin;
                            copy.targetMax = fs.targetMax;
                            output.add(copy);
                        }
                    }
                }
            } else {
                FlatStep fs = new FlatStep();
                fs.type = type;
                fs.name = step.has("name") && !step.get("name").isNull() ? step.get("name").asText() : defaultStepName(type);

                int durVal = 300;
                double distVal = 0.0;
                if (step.has("duration") && !step.get("duration").isNull()) {
                    JsonNode dur = step.get("duration");
                    String durType = dur.has("type") ? dur.get("type").asText() : "time";
                    if ("time".equals(durType)) {
                        durVal = dur.has("value") ? dur.get("value").asInt() : 300;
                    } else if ("distance".equals(durType)) {
                        distVal = dur.has("value") ? dur.get("value").asDouble() : 1000.0;
                        durVal = (int) Math.round(distVal / getDefaultSpeed(defaultSport));
                    }
                }
                fs.duration = durVal;
                fs.distance = distVal;

                fs.targetType = "open";
                if (step.has("target") && !step.get("target").isNull()) {
                    JsonNode tgt = step.get("target");
                    fs.targetType = tgt.has("type") ? tgt.get("type").asText() : "open";
                    if (tgt.has("zone")) fs.targetZone = tgt.get("zone").asInt();
                    if (tgt.has("min")) fs.targetMin = tgt.get("min").asDouble();
                    if (tgt.has("max")) fs.targetMax = tgt.get("max").asDouble();
                }
                output.add(fs);
            }
        }
    }

    private String defaultStepName(String type) {
        return switch (type) {
            case "warmup" -> "Warm-up";
            case "cooldown" -> "Cool-down";
            case "rest" -> "Rest";
            case "recovery" -> "Recovery";
            default -> "Interval";
        };
    }

    private boolean isIntensityTarget(String targetType) {
        return targetType != null && !targetType.equals("open") && !targetType.equals("rpe") && !targetType.equals("cadence");
    }

    private BigDecimal calculateStepDurationCompliance(int planned, int actual) {
        if (planned <= 0) return BigDecimal.valueOf(100.0);
        double ratio = (double) actual / planned;
        if (ratio >= 0.9 && ratio <= 1.1) return BigDecimal.valueOf(100.0);
        if (ratio < 0.9) {
            return BigDecimal.valueOf(Math.max(0.0, 100.0 * (ratio / 0.9)))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(Math.max(0.0, 100.0 * (1.0 - (ratio - 1.1))))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateStepIntensityCompliance(double targetMin, double targetMax, double actual) {
        if (targetMin <= 0 && targetMax <= 0) return BigDecimal.valueOf(100.0);
        if (targetMin <= 0) targetMin = targetMax * 0.8;
        if (targetMax <= 0) targetMax = targetMin * 1.2;

        if (actual >= targetMin && actual <= targetMax) return BigDecimal.valueOf(100.0);
        if (actual < targetMin) {
            return BigDecimal.valueOf(Math.max(0.0, 100.0 * (actual / targetMin)))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(Math.max(0.0, 100.0 * (1.0 - (actual - targetMax) / targetMax)))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private ZoneRange getZoneBounds(String zonesJson, int zoneNumber) {
        if (zonesJson == null || zonesJson.isBlank()) return null;
        try {
            JsonNode root = MAPPER.readTree(zonesJson);
            if (root.isArray()) {
                for (JsonNode z : root) {
                    if (z.has("zone") && z.get("zone").asInt() == zoneNumber) {
                        double min = z.has("min") ? z.get("min").asDouble() : 0.0;
                        double max = z.has("max") ? z.get("max").asDouble() : 0.0;
                        return new ZoneRange(min, max);
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private ZoneRange getDefaultPowerZonePct(int zone) {
        return switch (zone) {
            case 1 -> new ZoneRange(0, 55);
            case 2 -> new ZoneRange(56, 75);
            case 3 -> new ZoneRange(76, 90);
            case 4 -> new ZoneRange(91, 105);
            case 5 -> new ZoneRange(106, 120);
            case 6 -> new ZoneRange(121, 150);
            default -> new ZoneRange(151, 200);
        };
    }

    private ZoneRange getDefaultHrZonePct(int zone) {
        return switch (zone) {
            case 1 -> new ZoneRange(0, 68);
            case 2 -> new ZoneRange(69, 83);
            case 3 -> new ZoneRange(84, 94);
            case 4 -> new ZoneRange(95, 105);
            default -> new ZoneRange(106, 120);
        };
    }

    private int estimateZoneForValue(double value, double threshold, String type, String zonesJson) {
        if (threshold <= 0) return 2;
        double pct = (value / threshold) * 100.0;
        if ("power".equals(type)) {
            if (pct < 56) return 1;
            if (pct < 76) return 2;
            if (pct < 91) return 3;
            if (pct < 106) return 4;
            return 5;
        } else {
            if (pct < 69) return 1;
            if (pct < 84) return 2;
            if (pct < 95) return 3;
            if (pct < 106) return 4;
            return 5;
        }
    }

    private String formatPaceSecs(double seconds) {
        if (seconds <= 0) return "0:00";
        int m = (int) (seconds / 60);
        int s = (int) Math.round(seconds % 60);
        return String.format("%d:%02d", m, s);
    }

    private String formatSpeedToPaceStr(double speedMps, String sport) {
        if (speedMps <= 0.1) return "--:--";
        double paceSecs = "swimming".equalsIgnoreCase(sport) ? (100.0 / speedMps) : (1000.0 / speedMps);
        if (paceSecs > 1800) return "--:--";
        int m = (int) (paceSecs / 60);
        int s = (int) Math.round(paceSecs % 60);
        return String.format("%d:%02d/%s", m, s, "swimming".equalsIgnoreCase(sport) ? "100m" : "km");
    }


    private static double getDefaultSpeed(String sport) {
        if (sport == null) return 3.33;
        return switch (sport.toLowerCase()) {
            case "cycling" -> 8.33;
            case "running" -> 3.33;
            case "swimming" -> 0.83;
            default -> 3.33;
        };
    }

    private static double getHeuristicDistance(double durationSeconds, String sport) {
        if (sport == null) return 0.0;
        return switch (sport.toLowerCase()) {
            case "swimming" -> (durationSeconds / 2400.0) * 1400.0;
            case "cycling" -> (durationSeconds / 3600.0) * 28000.0;
            case "running" -> (durationSeconds / 2700.0) * 7500.0;
            default -> 0.0;
        };
    }

    private record ZoneRange(double min, double max) {}

    private static class FlatStep {
        String name;
        String type;
        int duration;
        double distance;
        String targetType;
        int targetZone;
        double targetMin;
        double targetMax;
    }

    private static int getHeartRateAtSecond(ActivityStreamData stream, int second) {
        if (stream == null || stream.timestamps() == null || stream.heartRate() == null) {
            return 0;
        }
        int[] timestamps = stream.timestamps();
        short[] heartRates = stream.heartRate();
        if (timestamps.length == 0 || heartRates.length == 0) {
            return 0;
        }

        int closestIdx = 0;
        int minDiff = Integer.MAX_VALUE;
        for (int i = 0; i < timestamps.length; i++) {
            int diff = Math.abs(timestamps[i] - second);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        if (minDiff > 10) {
            return 0;
        }

        return closestIdx < heartRates.length ? heartRates[closestIdx] : 0;
    }
}
