package com.coachfit.coach.application.service;

import com.coachfit.coach.application.port.in.CoachWorkoutAssignmentUseCase;
import com.coachfit.coach.application.port.out.*;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.coach.domain.model.CoachAthlete;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Application service implementing {@link CoachWorkoutAssignmentUseCase}.
 *
 * <p>Orchestrates workout assignment: validates relationship + permissions,
 * writes the calendar event via {@link CoachCalendarPort}, and triggers
 * a {@code workout_assigned} notification to the athlete.
 */
@Service
@Transactional
public class CoachWorkoutAssignmentService implements CoachWorkoutAssignmentUseCase {

    private static final Logger log = LoggerFactory.getLogger(CoachWorkoutAssignmentService.class);

    private final CoachAthletePersistencePort coachAthletePersistence;
    private final CoachAthleteQueryPort       athleteQuery;
    private final CoachUserQueryPort          userQuery;
    private final CoachCalendarPort           calendarPort;
    private final CoachNotificationPort       notificationPort;

    public CoachWorkoutAssignmentService(
            CoachAthletePersistencePort coachAthletePersistence,
            CoachAthleteQueryPort athleteQuery,
            CoachUserQueryPort userQuery,
            CoachCalendarPort calendarPort,
            CoachNotificationPort notificationPort) {
        this.coachAthletePersistence = coachAthletePersistence;
        this.athleteQuery            = athleteQuery;
        this.userQuery               = userQuery;
        this.calendarPort            = calendarPort;
        this.notificationPort        = notificationPort;
    }

    // ── assign ────────────────────────────────────────────────────────────────

    @Override
    public AssignResult assign(UUID coachId, UUID athleteId, AssignCommand command) {
        requireActive(coachId, athleteId);

        String workoutTitle = athleteQuery.findWorkoutTitle(command.workoutId())
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "Workout not found: " + command.workoutId()));

        UUID eventId = calendarPort.assignWorkout(
                athleteId, command.workoutId(), workoutTitle,
                command.date(), command.notes(), coachId);

        // Notify athlete
        CoachUserQueryPort.UserRow coach = userQuery.findUserById(coachId).orElse(null);
        String coachName = coach != null ? coach.fullName() : "Your coach";

        notificationPort.send(
                athleteId,
                "workout_assigned",
                coachName + " assigned you a workout",
                workoutTitle + " on " + command.date(),
                Map.of("coachId", coachId.toString(),
                        "workoutId", command.workoutId().toString(),
                        "calendarEventId", eventId.toString(),
                        "date", command.date().toString())
        );

        log.info("Coach {} assigned workout {} to athlete {} on {} → event {}",
                coachId, command.workoutId(), athleteId, command.date(), eventId);

        return new AssignResult(eventId, command.date().toString(), workoutTitle, "planned", "coach");
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Override
    public void update(UUID coachId, UUID athleteId, UUID eventId, UpdateAssignCommand command) {
        requireActive(coachId, athleteId);

        // Verify the event actually belongs to this athlete and was coach-assigned
        var ownership = calendarPort.findEventOwnership(eventId).orElseThrow(() ->
                new CoachRelationshipNotFoundException("Calendar event not found: " + eventId));

        if (!athleteId.equals(ownership.athleteUserId())) {
            throw new CoachRelationshipNotFoundException(
                    "Event " + eventId + " does not belong to athlete " + athleteId);
        }
        if (!"coach".equals(ownership.assignedBy())) {
            throw new CoachRelationshipNotFoundException(
                    "Event " + eventId + " was not assigned by a coach");
        }

        calendarPort.updateAssignedEvent(eventId, athleteId, command.date(), command.notes());
    }

    // ── remove ────────────────────────────────────────────────────────────────

    @Override
    public void remove(UUID coachId, UUID athleteId, UUID eventId) {
        requireActive(coachId, athleteId);

        var ownership = calendarPort.findEventOwnership(eventId).orElseThrow(() ->
                new CoachRelationshipNotFoundException("Calendar event not found: " + eventId));

        if (!athleteId.equals(ownership.athleteUserId())) {
            throw new CoachRelationshipNotFoundException(
                    "Event " + eventId + " does not belong to athlete " + athleteId);
        }

        calendarPort.removeAssignedEvent(eventId, athleteId);
        log.info("Coach {} removed assigned event {} from athlete {}", coachId, eventId, athleteId);
    }

    // ── addWorkoutToAthleteLibrary ────────────────────────────────────────────

    @Override
    public UUID addWorkoutToAthleteLibrary(UUID coachId, UUID athleteId, UUID workoutId) {
        requireActive(coachId, athleteId);

        // Verify source workout exists
        athleteQuery.findWorkout(workoutId).orElseThrow(() ->
                new CoachRelationshipNotFoundException("Workout not found: " + workoutId));

        UUID newId = calendarPort.copyWorkoutToAthleteLibrary(workoutId, athleteId);
        log.info("Coach {} copied workout {} to athlete {} library → {}", coachId, workoutId, athleteId, newId);
        return newId;
    }

    // ── bulkAssign ────────────────────────────────────────────────────────────

    @Override
    public BulkAssignResult bulkAssign(UUID coachId, BulkAssignCommand command) {
        String workoutTitle = athleteQuery.findWorkoutTitle(command.workoutId())
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "Workout not found: " + command.workoutId()));

        CoachUserQueryPort.UserRow coach = userQuery.findUserById(coachId).orElse(null);
        String coachName = coach != null ? coach.fullName() : "Your coach";

        int created = 0;
        int failed  = 0;

        for (UUID athleteId : command.athleteIds()) {
            try {
                // Verify active relationship
                boolean active = coachAthletePersistence
                        .findByCoachAndAthlete(coachId, athleteId)
                        .map(CoachAthlete::isActive)
                        .orElse(false);
                if (!active) { failed++; continue; }

                UUID eventId = calendarPort.assignWorkout(
                        athleteId, command.workoutId(), workoutTitle,
                        command.date(), command.notes(), coachId);

                notificationPort.send(
                        athleteId,
                        "workout_assigned",
                        coachName + " assigned you a workout",
                        workoutTitle + " on " + command.date(),
                        Map.of("coachId", coachId.toString(),
                                "workoutId", command.workoutId().toString(),
                                "calendarEventId", eventId.toString(),
                                "date", command.date().toString())
                );

                created++;
            } catch (Exception e) {
                log.warn("Bulk assign failed for athlete {}: {}", athleteId, e.getMessage());
                failed++;
            }
        }

        log.info("Coach {} bulk-assigned workout {} to {}/{} athletes on {}",
                coachId, command.workoutId(), created, command.athleteIds().size(), command.date());

        return new BulkAssignResult(created, failed);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CoachAthlete requireActive(UUID coachId, UUID athleteId) {
        return coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId)
                .filter(CoachAthlete::isActive)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active relationship for coach " + coachId + " / athlete " + athleteId));
    }
}
