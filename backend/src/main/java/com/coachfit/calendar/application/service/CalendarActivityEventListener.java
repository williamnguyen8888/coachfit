package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.CalendarEventSummary;
import com.coachfit.shared.domain.SportNormalizer;
import com.coachfit.shared.domain.event.ActivityCreatedEvent;
import com.coachfit.shared.domain.event.ActivityDeletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class CalendarActivityEventListener {

    private static final Logger log = LoggerFactory.getLogger(CalendarActivityEventListener.class);

    /** Minimum score to auto-link a planned workout to an activity. */
    private static final BigDecimal AUTO_LINK_MIN_SCORE = BigDecimal.valueOf(30.0);

    /**
     * Minimum score required to auto-link an activity to a *skipped* planned workout.
     * Higher threshold because we're also reversing a deliberate user action.
     */
    private static final BigDecimal SKIP_RELINK_MIN_SCORE = BigDecimal.valueOf(90.0);

    private final CalendarEventPersistencePort port;
    private final JdbcClient                    jdbcClient;

    public CalendarActivityEventListener(CalendarEventPersistencePort port, JdbcClient jdbcClient) {
        this.port       = port;
        this.jdbcClient = jdbcClient;
    }

    @EventListener
    @Transactional
    public void onActivityCreated(ActivityCreatedEvent event) {
        log.info("Handling ActivityCreatedEvent: userId={} activityId={} sport={}",
                event.userId(), event.activityId(), event.sport());

        if (port.hasActiveEventForActivity(event.userId(), event.activityId())) {
            log.info("Activity {} already has an active calendar event; skipping auto-link", event.activityId());
            return;
        }

        // 1. Resolve local date from user's timezone
        String tz = port.findUserTimezone(event.userId());
        ZoneId zoneId = ZoneId.of(tz);
        LocalDate activityDate = event.startedAt().atZone(zoneId).toLocalDate();

        // 2. Search within a ±1-day window to handle timezone edge cases
        //    (e.g. activity starts at 23:45 local but workout planned for next calendar day).
        //    We score every candidate across all days and pick the global best.
        record DayCandidate(CalendarEventSummary event, BigDecimal score) {}
        DayCandidate globalBest = null;

        for (int offset = -1; offset <= 1; offset++) {
            LocalDate searchDate = activityDate.plusDays(offset);

            // 2a. Planned (status='planned') candidates
            List<CalendarEventSummary> planned = port.findPlannedWorkoutsByDate(event.userId(), searchDate);
            for (CalendarEventSummary candidate : planned) {
                if (candidate.workoutSport() == null || event.sport() == null) continue;
                if (!SportNormalizer.sameSport(candidate.workoutSport(), event.sport())) continue;

                BigDecimal score = calculateComplianceScore(candidate.workoutDuration(), event.durationSeconds());
                if (score.compareTo(AUTO_LINK_MIN_SCORE) < 0) continue;

                if (globalBest == null || score.compareTo(globalBest.score()) > 0) {
                    globalBest = new DayCandidate(candidate, score);
                }
            }

            // 2b. Skipped candidates — only re-link if score is very high
            //     (we don't want to silently undo a skip for a marginal match)
            List<CalendarEventSummary> skipped = port.findSkippedWorkoutsByDate(event.userId(), searchDate);
            for (CalendarEventSummary candidate : skipped) {
                if (candidate.workoutSport() == null || event.sport() == null) continue;
                if (!SportNormalizer.sameSport(candidate.workoutSport(), event.sport())) continue;

                BigDecimal score = calculateComplianceScore(candidate.workoutDuration(), event.durationSeconds());
                if (score.compareTo(SKIP_RELINK_MIN_SCORE) < 0) continue;

                if (globalBest == null || score.compareTo(globalBest.score()) > 0) {
                    globalBest = new DayCandidate(candidate, score);
                }
            }
        }

        if (globalBest != null) {
            CalendarEventSummary matched = globalBest.event();
            BigDecimal complianceScore  = globalBest.score();

            // If we matched a skipped event, restore it to planned so linkActivity()
            // can correctly transition it to completed/partial.
            if ("skipped".equals(matched.status())) {
                port.updateStatus(matched.id(), matched.userId(), "planned");
                log.info("Auto-unskipped calendar event {} to link with activity {}", matched.id(), event.activityId());
            }

            port.linkActivity(matched.id(), event.userId(), event.activityId(), complianceScore);
            log.info("Linked activity {} to planned workout calendar event {} (date={}) with compliance={}%",
                    event.activityId(), matched.id(), matched.date(), complianceScore);
        } else {
            // No match — create a standalone completed event for the unmatched activity
            port.createStandaloneActivityEvent(
                    event.userId(),
                    activityDate,
                    event.activityId(),
                    event.name(),
                    event.sport()
            );
            log.info("Created auto-completed calendar event for unmatched activity {}", event.activityId());
        }
    }

    @EventListener
    @Transactional
    public void onActivityDeleted(ActivityDeletedEvent event) {
        log.info("Handling ActivityDeletedEvent: userId={} activityId={}", event.userId(), event.activityId());

        List<UUID> linkedEventIds = jdbcClient.sql("""
                SELECT id FROM calendar_events
                 WHERE activity_id = :activityId
                   AND deleted_at IS NULL
                """)
                .param("activityId", event.activityId())
                .query(UUID.class)
                .list();

        for (UUID eventId : linkedEventIds) {
            Optional<UUID> workoutIdOpt = jdbcClient.sql("""
                    SELECT workout_id FROM calendar_events WHERE id = :id
                    """)
                    .param("id", eventId)
                    .query(UUID.class)
                    .optional();

            if (workoutIdOpt.isEmpty()) {
                // workoutId is NULL → standalone activity event → soft delete it
                port.softDelete(eventId);
                log.info("Soft-deleted standalone calendar event {} because linked activity was deleted", eventId);
            } else {
                // Has a workout → planned workout event → unlink only
                port.unlinkActivity(eventId, event.userId());
                log.info("Unlinked calendar event {} because linked activity was deleted", eventId);
            }
        }
    }

    // BUG-04: Both Math.max AND Math.min — score is always in [0, 100].
    private static BigDecimal calculateComplianceScore(Integer plannedDuration, int actualDuration) {
        if (plannedDuration == null || plannedDuration <= 0) {
            return BigDecimal.valueOf(100.0);
        }

        double ratio = (double) actualDuration / plannedDuration;
        if (ratio >= 0.9 && ratio <= 1.1) {
            return BigDecimal.valueOf(100.0);
        }
        if (ratio < 0.9) {
            return BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, 100.0 * (ratio / 0.9))))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, 100.0 * (1.0 - (ratio - 1.1)))))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
