package com.coachfit.shared.domain.event;

import java.util.UUID;

public record ActivityDeletedEvent(
        UUID userId,
        UUID activityId
) {}
