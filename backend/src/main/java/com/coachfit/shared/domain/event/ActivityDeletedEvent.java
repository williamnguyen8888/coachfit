package com.coachfit.shared.domain.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when an activity is soft-deleted.
 *
 * @param userId     the owner
 * @param activityId the deleted activity UUID
 * @param sport      the sport of the deleted activity (may be null if unknown at publish time)
 * @param startedAt  the start timestamp of the deleted activity (may be null if unknown)
 */
public record ActivityDeletedEvent(
        UUID    userId,
        UUID    activityId,
        String  sport,
        Instant startedAt
) {}
