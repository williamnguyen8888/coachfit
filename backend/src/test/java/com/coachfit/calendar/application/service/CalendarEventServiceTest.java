package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.UpdateCalendarEventUseCase.UpdateCommand;
import com.coachfit.calendar.application.port.out.AutoLinkActivityCandidate;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.CalendarEventSummary;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.SimpleActivityDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarEventServiceTest {

    @Mock CalendarEventPersistencePort port;

    CalendarEventService service;

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID EVENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID WORKOUT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID ACTIVITY_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_ACTIVITY_ID = UUID.fromString("30000000-0000-0000-0000-000000000002");

    @BeforeEach
    void setUp() {
        service = new CalendarEventService(port);
    }

    @Test
    void update_dateChangedForPlannedWorkout_doesNotAutoLinkActivityOnNewDate() {
        LocalDate oldDate = LocalDate.of(2026, 6, 1);
        LocalDate newDate = LocalDate.of(2026, 6, 2);
        CalendarEventSummary existing = event(oldDate, "planned", WORKOUT_ID, null);
        CalendarEventSummary updated = event(newDate, "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, newDate, "workout", "Endurance", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, newDate))
                .thenReturn(List.of());

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(newDate, "workout", "Endurance", null, WORKOUT_ID));

        verify(port, never()).linkActivity(any(), any(), any(), any());
    }

    @Test
    void update_dateChangedForLinkedWorkout_unlinksAndKeepsActivityOnOriginalDate() {
        LocalDate oldDate = LocalDate.of(2026, 6, 1);
        LocalDate newDate = LocalDate.of(2026, 6, 2);
        CalendarEventSummary existing = event(oldDate, "completed", WORKOUT_ID, ACTIVITY_ID);
        CalendarEventSummary updated = event(newDate, "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, newDate, "workout", "Endurance", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, newDate))
                .thenReturn(List.of());

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(newDate, "workout", "Endurance", null, WORKOUT_ID));

        verify(port).unlinkActivity(EVENT_ID);
        verify(port).createStandaloneActivityEvent(
                USER_ID, oldDate, ACTIVITY_ID, "Morning Ride", "cycling");
        verify(port, never()).linkActivity(any(), any(), any(), any());
    }

    @Test
    void update_dateChangedToDateWithClearStandaloneActivity_autoLinksCandidate() {
        LocalDate oldDate = LocalDate.of(2026, 6, 1);
        LocalDate newDate = LocalDate.of(2026, 6, 2);
        CalendarEventSummary existing = event(oldDate, "planned", WORKOUT_ID, null);
        CalendarEventSummary updated = event(newDate, "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, newDate, "workout", "Endurance", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, newDate))
                .thenReturn(List.of(new AutoLinkActivityCandidate(
                        ACTIVITY_ID, 3500, "cycling", "Morning Ride")));

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(newDate, "workout", "Endurance", null, WORKOUT_ID));

        verify(port).linkActivity(EVENT_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
    }

    @Test
    void update_dateChangedWithAmbiguousStandaloneActivities_doesNotAutoLink() {
        LocalDate oldDate = LocalDate.of(2026, 6, 1);
        LocalDate newDate = LocalDate.of(2026, 6, 2);
        CalendarEventSummary existing = event(oldDate, "planned", WORKOUT_ID, null);
        CalendarEventSummary updated = event(newDate, "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, newDate, "workout", "Endurance", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, newDate))
                .thenReturn(List.of(
                        new AutoLinkActivityCandidate(ACTIVITY_ID, 3500, "cycling", "Morning Ride"),
                        new AutoLinkActivityCandidate(OTHER_ACTIVITY_ID, 3700, "cycling", "Evening Ride")
                ));

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(newDate, "workout", "Endurance", null, WORKOUT_ID));

        verify(port, never()).linkActivity(any(), any(), any(), any());
    }

    @Test
    void update_dateChangedBackToGymDay_autoLinksStrengthAliases() {
        LocalDate oldDate = LocalDate.of(2026, 6, 2);
        LocalDate originalGymDate = LocalDate.of(2026, 6, 1);
        CalendarEventSummary existing = strengthEvent(oldDate, "planned", WORKOUT_ID, null);
        CalendarEventSummary updated = strengthEvent(originalGymDate, "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, originalGymDate, "workout", "Gym", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, originalGymDate))
                .thenReturn(List.of(new AutoLinkActivityCandidate(
                        ACTIVITY_ID, 2700, "gym", "Gym Strength Session")));

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(originalGymDate, "workout", "Gym", null, WORKOUT_ID));

        verify(port).linkActivity(EVENT_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
    }

    @Test
    void update_triathleteStrengthMovedAwayThenBack_relinksOriginalStrengthActivity() {
        LocalDate strengthDate = LocalDate.of(2026, 6, 1);
        LocalDate movedDate = LocalDate.of(2026, 6, 2);
        CalendarEventSummary linkedStrength = triathleteStrengthEvent(strengthDate, "completed", ACTIVITY_ID);
        CalendarEventSummary movedPlanned = triathleteStrengthEvent(movedDate, "planned", null);
        CalendarEventSummary movedBackPlanned = triathleteStrengthEvent(strengthDate, "planned", null);

        when(port.findById(EVENT_ID))
                .thenReturn(Optional.of(linkedStrength), Optional.of(movedPlanned),
                        Optional.of(movedPlanned), Optional.of(movedBackPlanned));
        when(port.update(EVENT_ID, USER_ID, movedDate, "workout",
                "Triathlete Strength 45min", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.update(EVENT_ID, USER_ID, strengthDate, "workout",
                "Triathlete Strength 45min", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, movedDate))
                .thenReturn(List.of());
        when(port.findAutoLinkActivityCandidates(USER_ID, strengthDate))
                .thenReturn(List.of(new AutoLinkActivityCandidate(
                        ACTIVITY_ID, 2820, "strength", "Strength & Core")));

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(movedDate, "workout", "Triathlete Strength 45min", null, WORKOUT_ID));
        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(strengthDate, "workout", "Triathlete Strength 45min", null, WORKOUT_ID));

        verify(port).unlinkActivity(EVENT_ID);
        verify(port).createStandaloneActivityEvent(
                USER_ID, strengthDate, ACTIVITY_ID, "Strength & Core", "strength");
        verify(port).linkActivity(EVENT_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
    }

    @Test
    void update_sameDateUnlinkedTriathleteStrength_relinksStandaloneActivity() {
        LocalDate strengthDate = LocalDate.of(2026, 5, 9);
        CalendarEventSummary existing = triathleteStrengthEvent(strengthDate, "planned", null);
        CalendarEventSummary updated = triathleteStrengthEvent(strengthDate, "planned", null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(port.update(EVENT_ID, USER_ID, strengthDate, "workout",
                "Triathlete Strength 45min", null, WORKOUT_ID))
                .thenReturn(true);
        when(port.findAutoLinkActivityCandidates(USER_ID, strengthDate))
                .thenReturn(List.of(new AutoLinkActivityCandidate(
                        ACTIVITY_ID, 2700, "strength", "Gym Strength Session")));

        service.update(USER_ID, EVENT_ID,
                new UpdateCommand(strengthDate, "workout", "Triathlete Strength 45min", null, WORKOUT_ID));

        verify(port).linkActivity(EVENT_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
    }

    @Test
    void link_activityMustBelongToUser() {
        CalendarEventSummary existing = event(LocalDate.of(2026, 6, 1), "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing));
        when(port.findActivityDetails(USER_ID, ACTIVITY_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.link(USER_ID, EVENT_ID, ACTIVITY_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        verify(port, never()).linkActivity(any(), any(), any(), any());
    }

    @Test
    void link_rejectsSportMismatch() {
        CalendarEventSummary existing = event(LocalDate.of(2026, 6, 1), "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing));
        when(port.findActivityDetails(USER_ID, ACTIVITY_ID))
                .thenReturn(Optional.of(new SimpleActivityDetails(3600, "running")));

        assertThatThrownBy(() -> service.link(USER_ID, EVENT_ID, ACTIVITY_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(port, never()).linkActivity(any(), any(), any(), any());
    }

    @Test
    void link_acceptsGymActivityForStrengthWorkout() {
        CalendarEventSummary existing = strengthEvent(LocalDate.of(2026, 6, 1), "planned", WORKOUT_ID, null);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing));
        when(port.findActivityDetails(USER_ID, ACTIVITY_ID))
                .thenReturn(Optional.of(new SimpleActivityDetails(2700, "strength_training")));

        service.link(USER_ID, EVENT_ID, ACTIVITY_ID);

        verify(port).linkActivity(EVENT_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
    }

    @Test
    void unlink_workoutEventCreatesStandaloneActivityCard() {
        LocalDate date = LocalDate.of(2026, 6, 1);
        CalendarEventSummary existing = event(date, "completed", WORKOUT_ID, ACTIVITY_ID);

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing));

        service.unlink(USER_ID, EVENT_ID);

        verify(port).unlinkActivity(EVENT_ID);
        verify(port).createStandaloneActivityEvent(
                USER_ID, date, ACTIVITY_ID, "Morning Ride", "cycling");
    }

    private static CalendarEventSummary event(
            LocalDate date,
            String status,
            UUID workoutId,
            UUID activityId
    ) {
        return new CalendarEventSummary(
                EVENT_ID,
                USER_ID,
                date,
                "workout",
                workoutId,
                activityId,
                "Endurance",
                null,
                status,
                (short) 0,
                activityId == null ? null : BigDecimal.valueOf(95),
                "cycling",
                3600,
                BigDecimal.valueOf(75),
                null,
                BigDecimal.valueOf(72),
                3500,
                "cycling",
                "Morning Ride",
                BigDecimal.valueOf(42000),
                145,
                175,
                220,
                "strava"
        );
    }

    private static CalendarEventSummary strengthEvent(
            LocalDate date,
            String status,
            UUID workoutId,
            UUID activityId
    ) {
        return new CalendarEventSummary(
                EVENT_ID,
                USER_ID,
                date,
                "workout",
                workoutId,
                activityId,
                "Gym",
                null,
                status,
                (short) 0,
                activityId == null ? null : BigDecimal.valueOf(100),
                "strength",
                2700,
                BigDecimal.valueOf(35),
                null,
                BigDecimal.valueOf(35),
                2700,
                "gym",
                "Gym Strength Session",
                BigDecimal.ZERO,
                128,
                158,
                null,
                "manual"
        );
    }

    private static CalendarEventSummary triathleteStrengthEvent(
            LocalDate date,
            String status,
            UUID activityId
    ) {
        return new CalendarEventSummary(
                EVENT_ID,
                USER_ID,
                date,
                "workout",
                WORKOUT_ID,
                activityId,
                "Triathlete Strength 45min",
                null,
                status,
                (short) 0,
                activityId == null ? null : BigDecimal.valueOf(100),
                "strength",
                2700,
                BigDecimal.valueOf(35),
                null,
                BigDecimal.valueOf(35),
                2820,
                "strength",
                "Strength & Core",
                BigDecimal.ZERO,
                132,
                162,
                null,
                "manual"
        );
    }
}
