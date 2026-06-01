package com.coachfit.shared.domain.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ActivityCreatedEvent(
        UUID userId,
        UUID activityId,
        String sport,
        String name,
        String description,
        Instant startedAt,
        int durationSeconds,
        BigDecimal distanceMeters,
        BigDecimal tss
) {}
