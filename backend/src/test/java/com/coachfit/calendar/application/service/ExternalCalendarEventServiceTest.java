package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.ExternalEventCommand;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.UpsertMode;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalEventDraft;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalEventRow;
import com.coachfit.calendar.application.port.out.ExternalCalendarEventPersistencePort.ExternalWorkoutDraft;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExternalCalendarEventServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock ExternalCalendarEventPersistencePort port;

    ExternalCalendarEventService service;

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID EVENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID WORKOUT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        service = new ExternalCalendarEventService(port);
    }

    @Test
    void create_workoutWithoutWorkoutId_createsImportWorkoutAndCalendarEvent() {
        ExternalEventCommand command = command("WORKOUT", "2026-06-10T00:00:00",
                "Tempo Ride", "Ride", "tp-42", 3600, BigDecimal.valueOf(80));

        when(port.createWorkout(eq(USER_ID), any())).thenReturn(WORKOUT_ID);
        when(port.createEvent(eq(USER_ID), any())).thenReturn(EVENT_ID);
        when(port.findById(EVENT_ID)).thenReturn(Optional.of(
                row(EVENT_ID, WORKOUT_ID, "cycling", 3600, "trainingpeaks")));

        var result = service.create(USER_ID, "TrainingPeaks", command, UpsertMode.NONE);

        assertThat(result.id()).isEqualTo(EVENT_ID);
        assertThat(result.category()).isEqualTo("WORKOUT");
        assertThat(result.externalSource()).isEqualTo("trainingpeaks");

        ArgumentCaptor<ExternalWorkoutDraft> workoutCaptor = ArgumentCaptor.forClass(ExternalWorkoutDraft.class);
        verify(port).createWorkout(eq(USER_ID), workoutCaptor.capture());
        assertThat(workoutCaptor.getValue().sport()).isEqualTo("cycling");
        assertThat(workoutCaptor.getValue().estimatedDurationSeconds()).isEqualTo(3600);
        assertThat(workoutCaptor.getValue().estimatedTss()).isEqualByComparingTo("80");
        assertThat(workoutCaptor.getValue().stepsJson()).contains("\"value\":3600");

        ArgumentCaptor<ExternalEventDraft> eventCaptor = ArgumentCaptor.forClass(ExternalEventDraft.class);
        verify(port).createEvent(eq(USER_ID), eventCaptor.capture());
        assertThat(eventCaptor.getValue().date()).isEqualTo(LocalDate.of(2026, 6, 10));
        assertThat(eventCaptor.getValue().eventType()).isEqualTo("workout");
        assertThat(eventCaptor.getValue().workoutId()).isEqualTo(WORKOUT_ID);
        assertThat(eventCaptor.getValue().externalId()).isEqualTo("tp-42");
        assertThat(eventCaptor.getValue().externalSource()).isEqualTo("trainingpeaks");
    }

    @Test
    void create_workoutWithStructuredDescription_parsesDescriptionIntoSteps() throws Exception {
        ExternalEventCommand command = commandWithDescription(
                "WORKOUT",
                "2026-06-10",
                "Threshold Set",
                "Ride",
                "tp-structured",
                """
                10min warmup z2
                3x10min 88-92% / 5min z1
                10min cooldown z1
                """);

        when(port.createWorkout(eq(USER_ID), any())).thenReturn(WORKOUT_ID);
        when(port.createEvent(eq(USER_ID), any())).thenReturn(EVENT_ID);
        when(port.findById(EVENT_ID)).thenReturn(Optional.of(
                row(EVENT_ID, WORKOUT_ID, "cycling", 4500, "api")));

        service.create(USER_ID, "api", command, UpsertMode.NONE);

        ArgumentCaptor<ExternalWorkoutDraft> captor = ArgumentCaptor.forClass(ExternalWorkoutDraft.class);
        verify(port).createWorkout(eq(USER_ID), captor.capture());

        var steps = MAPPER.readTree(captor.getValue().stepsJson());
        assertThat(steps).hasSize(3);
        assertThat(steps.at("/1/type").asText()).isEqualTo("repeat");
        assertThat(steps.at("/1/count").asInt()).isEqualTo(3);
        assertThat(steps.at("/1/steps/0/target/type").asText()).isEqualTo("power_pct");
        assertThat(steps.at("/1/steps/0/target/min").asDouble()).isEqualTo(0.88);
        assertThat(captor.getValue().estimatedDurationSeconds()).isEqualTo(3900);
    }

    @Test
    void create_withUpsertAndExternalId_updatesExistingEvent() {
        ExternalEventCommand command = command("WORKOUT", "2026-06-11",
                "Updated Tempo", "Ride", "tp-42", 3900, BigDecimal.valueOf(85));
        ExternalEventRow existing = row(EVENT_ID, WORKOUT_ID, "cycling", 3600, "api");
        ExternalEventRow updated = row(EVENT_ID, WORKOUT_ID, "cycling", 3900, "api");

        when(port.findByExternalId(USER_ID, "api", "tp-42")).thenReturn(Optional.of(existing));
        when(port.updateWorkout(eq(WORKOUT_ID), eq(USER_ID), any())).thenReturn(true);
        when(port.updateEvent(eq(EVENT_ID), eq(USER_ID), any())).thenReturn(true);
        when(port.findById(EVENT_ID)).thenReturn(Optional.of(updated));

        var result = service.create(USER_ID, "api", command, UpsertMode.EXTERNAL_ID);

        assertThat(result.id()).isEqualTo(EVENT_ID);
        assertThat(result.movingTime()).isEqualTo(3900);
        verify(port, never()).createEvent(eq(USER_ID), any());
        verify(port).updateEvent(eq(EVENT_ID), eq(USER_ID), any());
    }

    @Test
    void create_withUpsertOnUid_updatesMatchingUid() {
        ExternalEventCommand command = commandWithUid("WORKOUT", "2026-06-11",
                "Updated Tempo", "Ride", "tp-99", "calendar-uid-99");
        ExternalEventRow existing = row(EVENT_ID, WORKOUT_ID, "cycling", 3600, "api",
                "WORKOUT", "calendar-uid-99");
        ExternalEventRow updated = row(EVENT_ID, WORKOUT_ID, "cycling", 3900, "api",
                "WORKOUT", "calendar-uid-99");

        when(port.findByUid(USER_ID, "calendar-uid-99")).thenReturn(Optional.of(existing));
        when(port.updateWorkout(eq(WORKOUT_ID), eq(USER_ID), any())).thenReturn(true);
        when(port.updateEvent(eq(EVENT_ID), eq(USER_ID), any())).thenReturn(true);
        when(port.findById(EVENT_ID)).thenReturn(Optional.of(updated));

        var result = service.create(USER_ID, "api", command, UpsertMode.UID);

        assertThat(result.id()).isEqualTo(EVENT_ID);
        assertThat(result.uid()).isEqualTo("calendar-uid-99");
        verify(port).findByUid(USER_ID, "calendar-uid-99");
        verify(port, never()).findByExternalId(any(), any(), any());
    }

    @Test
    void create_withUpsertOnUidRequiresUid() {
        ExternalEventCommand command = command("WORKOUT", "2026-06-11",
                "Updated Tempo", "Ride", "tp-42", 3900, BigDecimal.valueOf(85));

        assertThatThrownBy(() -> service.create(USER_ID, "api", command, UpsertMode.UID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }

    @Test
    void update_withoutSourcePreservesExistingExternalSource() {
        ExternalEventCommand command = command("WORKOUT", "2026-06-11",
                "Updated Tempo", "Ride", "tp-42", 3900, BigDecimal.valueOf(85));
        ExternalEventRow existing = row(EVENT_ID, WORKOUT_ID, "cycling", 3600, "trainingpeaks");

        when(port.findById(EVENT_ID)).thenReturn(Optional.of(existing));
        when(port.updateWorkout(eq(WORKOUT_ID), eq(USER_ID), any())).thenReturn(true);
        when(port.updateEvent(eq(EVENT_ID), eq(USER_ID), any())).thenReturn(true);

        service.update(USER_ID, EVENT_ID, null, command);

        ArgumentCaptor<ExternalEventDraft> captor = ArgumentCaptor.forClass(ExternalEventDraft.class);
        verify(port).updateEvent(eq(EVENT_ID), eq(USER_ID), captor.capture());
        assertThat(captor.getValue().externalSource()).isEqualTo("trainingpeaks");
    }

    @Test
    void deleteRange_mapsCategoryAndNormalizesSource() {
        LocalDate oldest = LocalDate.of(2026, 6, 1);
        LocalDate newest = LocalDate.of(2026, 6, 7);
        when(port.softDeleteRange(USER_ID, "training_peaks", oldest, newest,
                List.of("WORKOUT"), List.of("workout")))
                .thenReturn(3);

        int deleted = service.deleteRange(USER_ID, "Training Peaks", oldest, newest, List.of("WORKOUT"));

        assertThat(deleted).isEqualTo(3);
    }

    @Test
    void list_rejectsRangesOver366Days() {
        assertThatThrownBy(() -> service.list(
                USER_ID,
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2027, 1, 2),
                List.of("WORKOUT"),
                null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }

    private static ExternalEventCommand command(String category, String startDateLocal, String name,
                                                String type, String externalId, Integer movingTime,
                                                BigDecimal trainingLoad) {
        return commandWithDescription(category, startDateLocal, name, type, externalId,
                "Imported by test", movingTime, trainingLoad);
    }

    private static ExternalEventCommand commandWithDescription(String category, String startDateLocal,
                                                               String name, String type,
                                                               String externalId, String description) {
        return commandWithDescription(category, startDateLocal, name, type, externalId,
                description, null, null);
    }

    private static ExternalEventCommand commandWithDescription(String category, String startDateLocal,
                                                               String name, String type,
                                                               String externalId, String description,
                                                               Integer movingTime,
                                                               BigDecimal trainingLoad) {
        return new ExternalEventCommand(
                category,
                startDateLocal,
                null,
                name,
                description,
                type,
                movingTime,
                null,
                trainingLoad,
                null,
                null,
                null,
                List.of("import"),
                null,
                null,
                externalId,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static ExternalEventCommand commandWithUid(String category, String startDateLocal, String name,
                                                       String type, String externalId, String uid) {
        return new ExternalEventCommand(
                category,
                startDateLocal,
                null,
                name,
                "Imported by test",
                type,
                3900,
                null,
                BigDecimal.valueOf(85),
                null,
                null,
                null,
                List.of("import"),
                null,
                uid,
                externalId,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static ExternalEventRow row(UUID eventId, UUID workoutId, String sport,
                                        Integer duration, String source) {
        return row(eventId, workoutId, sport, duration, source, "WORKOUT", null);
    }

    private static ExternalEventRow row(UUID eventId, UUID workoutId, String sport,
                                        Integer duration, String source, String category, String uid) {
        return new ExternalEventRow(
                eventId,
                USER_ID,
                LocalDate.of(2026, 6, 10),
                "workout",
                workoutId,
                "Tempo Ride",
                "Imported by test",
                "planned",
                category,
                uid,
                "tp-42",
                source,
                sport,
                duration,
                BigDecimal.valueOf(80)
        );
    }
}
