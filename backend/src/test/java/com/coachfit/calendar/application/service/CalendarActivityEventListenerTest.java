package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort.CalendarEventSummary;
import com.coachfit.shared.domain.event.ActivityCreatedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarActivityEventListenerTest {

    @Mock(lenient = true) CalendarEventPersistencePort port;
    @Mock JdbcClient jdbcClient;

    CalendarActivityEventListener listener;

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID ACTIVITY_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID EVENT_ONE_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID EVENT_TWO_ID = UUID.fromString("10000000-0000-0000-0000-000000000002");
    private static final UUID WORKOUT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        listener = new CalendarActivityEventListener(port, jdbcClient);
    }

    @Test
    void onActivityCreated_doesNothingWhenActivityAlreadyHasCalendarEvent() {
        ActivityCreatedEvent event = activityCreated("cycling", 3600);
        when(port.hasActiveEventForActivity(USER_ID, ACTIVITY_ID)).thenReturn(true);

        listener.onActivityCreated(event);

        verify(port, never()).findUserTimezone(USER_ID);
        verify(port, never()).linkActivity(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verify(port, never()).createStandaloneActivityEvent(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onActivityCreated_linksBestDurationMatchWhenMultipleSameSportWorkoutsExist() {
        ActivityCreatedEvent event = activityCreated("cycling", 3500);
        LocalDate activityDate = LocalDate.of(2026, 6, 1);

        when(port.findUserTimezone(USER_ID)).thenReturn("UTC");
        when(port.findPlannedWorkoutsByDate(USER_ID, activityDate))
                .thenReturn(List.of(
                        plannedWorkout(EVENT_ONE_ID, activityDate, (short) 0, 7200),
                        plannedWorkout(EVENT_TWO_ID, activityDate, (short) 1, 3600)
                ));

        listener.onActivityCreated(event);

        verify(port).linkActivity(EVENT_TWO_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
        verify(port, never()).createStandaloneActivityEvent(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onActivityCreated_createsStandaloneEventWhenNoWorkoutMatches() {
        ActivityCreatedEvent event = activityCreated("running", 3500);
        LocalDate activityDate = LocalDate.of(2026, 6, 1);

        when(port.findUserTimezone(USER_ID)).thenReturn("UTC");
        when(port.findPlannedWorkoutsByDate(USER_ID, activityDate))
                .thenReturn(List.of(plannedWorkout(EVENT_ONE_ID, activityDate, (short) 0, 3600)));

        listener.onActivityCreated(event);

        verify(port).createStandaloneActivityEvent(
                USER_ID, activityDate, ACTIVITY_ID, "Morning Ride", "running");
        verify(port, never()).linkActivity(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onActivityCreated_linksGymActivityToStrengthWorkout() {
        ActivityCreatedEvent event = activityCreated("gym", 2700);
        LocalDate activityDate = LocalDate.of(2026, 6, 1);

        when(port.findUserTimezone(USER_ID)).thenReturn("UTC");
        when(port.findPlannedWorkoutsByDate(USER_ID, activityDate))
                .thenReturn(List.of(plannedWorkout(
                        EVENT_ONE_ID, activityDate, (short) 0, 2700, "strength")));

        listener.onActivityCreated(event);

        verify(port).linkActivity(EVENT_ONE_ID, USER_ID, ACTIVITY_ID, BigDecimal.valueOf(100.0));
        verify(port, never()).createStandaloneActivityEvent(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    private static ActivityCreatedEvent activityCreated(String sport, int durationSeconds) {
        return new ActivityCreatedEvent(
                USER_ID,
                ACTIVITY_ID,
                sport,
                "Morning Ride",
                null,
                Instant.parse("2026-06-01T08:00:00Z"),
                durationSeconds,
                BigDecimal.valueOf(42000),
                null
        );
    }

    private static CalendarEventSummary plannedWorkout(
            UUID eventId,
            LocalDate date,
            short orderIndex,
            int durationSeconds
    ) {
        return plannedWorkout(eventId, date, orderIndex, durationSeconds, "cycling");
    }

    private static CalendarEventSummary plannedWorkout(
            UUID eventId,
            LocalDate date,
            short orderIndex,
            int durationSeconds,
            String sport
    ) {
        return new CalendarEventSummary(
                eventId,
                USER_ID,
                date,
                "workout",
                WORKOUT_ID,
                null,
                "Workout",
                null,
                "planned",
                orderIndex,
                null,
                sport,
                durationSeconds,
                BigDecimal.valueOf(75),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
