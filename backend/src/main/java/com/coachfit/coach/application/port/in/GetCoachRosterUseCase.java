package com.coachfit.coach.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: list all athletes in a coach's roster.
 *
 * <p>Endpoint: {@code GET /api/v1/coach/athletes?page=0&size=20}
 * <p>Tier: 🏷️ Coach
 */
public interface GetCoachRosterUseCase {

    /**
     * Returns a paginated view of the coach's roster.
     *
     * @param coachId authenticated coach's user ID
     * @param page    0-based page number
     * @param size    page size (max 100)
     * @return paginated result
     */
    RosterPage getRoster(UUID coachId, int page, int size);

    record RosterPage(
            List<RosterEntry> content,
            int page,
            int size,
            long totalElements
    ) {}

    /**
     * A single athlete entry in the coach's roster.
     * Fitness/health snapshots are loaded via plain SQL (no cross-module imports).
     */
    record RosterEntry(
            UUID         relationshipId,
            UUID         athleteId,
            String       name,
            String       nickname,          // nullable
            String       avatarUrl,         // nullable
            String       status,
            List<String> sports,
            List<String> tags,
            FitnessSnap  fitness,           // nullable if no training load data
            LastActivity lastActivity,      // nullable
            HealthSnap   healthSnapshot,    // nullable
            Instant      acceptedAt         // nullable
    ) {}

    record FitnessSnap(
            Double ctl,
            Double atl,
            Double tsb
    ) {}

    record LastActivity(
            String date,
            String sport,
            String name
    ) {}

    record HealthSnap(
            Integer restingHr,
            Integer sleepScore
    ) {}
}
