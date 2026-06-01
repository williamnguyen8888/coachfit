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

        // 1. Get user's timezone & local date
        String tz = port.findUserTimezone(event.userId());
        ZoneId zoneId = ZoneId.of(tz);
        LocalDate activityDate = event.startedAt().atZone(zoneId).toLocalDate();

        // 2. Find planned workouts on this date
        List<CalendarEventSummary> candidates = port.findPlannedWorkoutsByDate(event.userId(), activityDate);

        // 3. Try to match by normalized sport
        CalendarEventSummary matchedWorkout = null;
        BigDecimal matchedComplianceScore = null;
        for (CalendarEventSummary candidate : candidates) {
            if (candidate.workoutSport() != null && event.sport() != null
                    && SportNormalizer.sameSport(candidate.workoutSport(), event.sport())) {
                BigDecimal complianceScore = calculateComplianceScore(
                        candidate.workoutDuration(), event.durationSeconds());
                if (matchedWorkout == null
                        || complianceScore.compareTo(matchedComplianceScore) > 0
                        || (complianceScore.compareTo(matchedComplianceScore) == 0
                            && candidate.orderIndex() < matchedWorkout.orderIndex())) {
                    matchedWorkout = candidate;
                    matchedComplianceScore = complianceScore;
                }
            }
        }

        if (matchedWorkout != null) {
            // 4. Calculate compliance score (Duration compliance)
            BigDecimal complianceScore = matchedComplianceScore != null
                    ? matchedComplianceScore
                    : BigDecimal.valueOf(100.0);

            // 5. Link activity to calendar event
            port.linkActivity(matchedWorkout.id(), event.userId(), event.activityId(), complianceScore);
            log.info("Linked activity {} to planned workout calendar event {} with compliance={}%",
                    event.activityId(), matchedWorkout.id(), complianceScore);
        } else {
            // 6. No match found -> auto-create a completed calendar event (pseudo-event)
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

        // Find calendar events linked to this activity
        List<UUID> linkedEventIds = jdbcClient.sql("""
                SELECT id FROM calendar_events
                 WHERE activity_id = :activityId
                   AND deleted_at IS NULL
                """)
                .param("activityId", event.activityId())
                .query(UUID.class)
                .list();

        for (UUID eventId : linkedEventIds) {
            // Check if it was an auto-created event (workoutId is null)
            Optional<UUID> workoutIdOpt = jdbcClient.sql("""
                    SELECT workout_id FROM calendar_events WHERE id = :id
                    """)
                    .param("id", eventId)
                    .query(UUID.class)
                    .optional();

            if (workoutIdOpt.isEmpty()) {
                // Standalone activity event -> soft delete it
                port.softDelete(eventId);
                log.info("Soft-deleted standalone calendar event {} because linked activity was deleted", eventId);
            } else {
                // Planned workout event -> unlink it
                port.unlinkActivity(eventId);
                log.info("Unlinked calendar event {} because linked activity was deleted", eventId);
            }
        }
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
}
