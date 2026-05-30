package com.coachfit.calendar.adapter.in.dto;

import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase.ActivitySummary;
import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase.CalendarEventView;
import com.coachfit.calendar.application.port.in.ListCalendarEventsUseCase.WorkoutSummary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Response DTO for all calendar event endpoints.
 *
 * <p>Matches the JSON shape documented in docs/05-api-design.md §Calendar:
 * <pre>
 * {
 *   "id": "uuid",
 *   "date": "2025-03-15",
 *   "eventType": "workout",
 *   "title": "Tempo Intervals",
 *   "status": "completed",
 *   "workout": { "id": "uuid", "sport": "cycling", "estimatedDuration": 3600 },
 *   "activity": { "id": "uuid", "tss": 75.5, "durationSeconds": 3650 },
 *   "complianceScore": 92.5,
 *   "orderIndex": 0,
 *   "assignedBy": null
 * }
 * </pre>
 */
public record CalendarEventResponse(
        UUID            id,
        LocalDate       date,
        String          eventType,
        String          title,
        String          description,
        String          status,
        short           orderIndex,
        BigDecimal      complianceScore,
        WorkoutPayload  workout,
        ActivityPayload activity,
        String          assignedBy      // null — coach assignment is a future ticket
) {

    public record WorkoutPayload(UUID id, String sport, Integer estimatedDuration) {
        static WorkoutPayload from(WorkoutSummary s) {
            return s == null ? null
                    : new WorkoutPayload(s.id(), s.sport(), s.estimatedDurationSeconds());
        }
    }

    public record ActivityPayload(UUID id, Double tss, Integer durationSeconds) {
        static ActivityPayload from(ActivitySummary s) {
            return s == null ? null
                    : new ActivityPayload(s.id(), s.tss(), s.durationSeconds());
        }
    }

    public static CalendarEventResponse from(CalendarEventView v) {
        return new CalendarEventResponse(
                v.id(),
                v.date(),
                v.eventType(),
                v.title(),
                v.description(),
                v.status(),
                v.orderIndex(),
                v.complianceScore(),
                WorkoutPayload.from(v.workout()),
                ActivityPayload.from(v.activity()),
                null
        );
    }
}
