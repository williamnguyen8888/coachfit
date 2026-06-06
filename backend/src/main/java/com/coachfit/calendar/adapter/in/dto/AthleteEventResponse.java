package com.coachfit.calendar.adapter.in.dto;

import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.ExternalEventView;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Intervals-style response for external athlete calendar events.
 */
public record AthleteEventResponse(
        UUID id,
        @JsonProperty("athlete_id") String athleteId,
        @JsonProperty("start_date_local") String startDateLocal,
        @JsonProperty("end_date_local") String endDateLocal,
        String category,
        String name,
        String description,
        String type,
        @JsonProperty("moving_time") Integer movingTime,
        @JsonProperty("icu_training_load") BigDecimal icuTrainingLoad,
        @JsonProperty("workout_id") UUID workoutId,
        String uid,
        @JsonProperty("external_id") String externalId,
        @JsonProperty("external_source") String externalSource,
        String status
) {

    private static final DateTimeFormatter LOCAL_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public static AthleteEventResponse from(ExternalEventView view) {
        return new AthleteEventResponse(
                view.id(),
                view.athleteUserId().toString(),
                atStartOfDay(view.date()),
                atStartOfDay(view.date().plusDays(1)),
                view.category(),
                view.name(),
                view.description(),
                view.type(),
                view.movingTime(),
                view.trainingLoad(),
                view.workoutId(),
                view.uid(),
                view.externalId(),
                view.externalSource(),
                view.status()
        );
    }

    private static String atStartOfDay(LocalDate date) {
        return LOCAL_DATE_TIME.format(date.atTime(LocalTime.MIDNIGHT));
    }
}
