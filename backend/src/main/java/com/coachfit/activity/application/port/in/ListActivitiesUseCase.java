package com.coachfit.activity.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: list activities for the authenticated user
 * (GET /api/v1/activities).
 *
 * <p>Mirrors the filters and pagination contract documented in
 * docs/05-api-design.md §GET /activities.
 */
public interface ListActivitiesUseCase {

    /**
     * Returns a page of the user's activities, applying any supplied filters.
     *
     * @param userId authenticated user
     * @param query  filter + pagination parameters
     * @return paged result
     */
    ActivityPage list(UUID userId, ActivityQuery query);

    // ── Query parameters ─────────────────────────────────────────────────────

    record ActivityQuery(
            String  sport,    // nullable — filter by sport (e.g. "cycling")
            String  source,   // nullable — filter by source (e.g. "strava", "garmin", "manual")
            Instant from,     // nullable — inclusive lower bound on started_at
            Instant to,       // nullable — inclusive upper bound on started_at
            int     page,     // 0-indexed page number
            int     size,     // page size
            String  sortField,  // field to sort by (e.g. "startedAt")
            String  sortDir     // "asc" or "desc"
    ) {}

    // ── Result types ─────────────────────────────────────────────────────────

    record ActivityPage(
            List<ActivityListItem> content,
            int  page,
            int  size,
            long totalElements,
            int  totalPages
    ) {}

    record ActivityListItem(
            UUID       id,
            String     sport,
            String     name,
            Instant    startedAt,
            int        durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgHeartRate,
            Integer    avgPower,
            BigDecimal tss,
            String     source
    ) {}
}
