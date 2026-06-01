package com.coachfit.workout.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: list public system workout templates
 * (GET /api/v1/workouts/templates).
 *
 * <p>Returns workouts where {@code is_template = true} AND
 * ({@code user_id IS NULL} (system) OR {@code is_public = true}).
 * Supports optional sport filtering and pagination.
 */
public interface ListWorkoutTemplatesUseCase {

    /**
     * Returns a page of public/system workout templates.
     *
     * @param sport optional sport filter
     * @param page  0-indexed page
     * @param size  page size (capped at 100)
     * @return paged result
     */
    TemplatePage listTemplates(String sport, int page, int size);

    // ── Result types ─────────────────────────────────────────────────────────

    record TemplatePage(
            List<TemplateListItem> content,
            int  page,
            int  size,
            long totalElements,
            int  totalPages
    ) {}

    record TemplateListItem(
            UUID       id,
            String     name,
            String     sport,
            String     description,
            Integer    estimatedDurationSeconds,
            BigDecimal estimatedTss,
            Double     estimatedDistance,
            Integer    averageIntensity,
            List<String> tags,
            String     source,
            Instant    createdAt
    ) {}
}
