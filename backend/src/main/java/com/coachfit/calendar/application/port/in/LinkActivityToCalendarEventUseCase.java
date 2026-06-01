package com.coachfit.calendar.application.port.in;

import java.util.UUID;

public interface LinkActivityToCalendarEventUseCase {
    void link(UUID userId, UUID eventId, UUID activityId);
    void unlink(UUID userId, UUID eventId);
}
