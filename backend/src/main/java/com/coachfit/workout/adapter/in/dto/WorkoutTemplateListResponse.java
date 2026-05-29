package com.coachfit.workout.adapter.in.dto;

import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase.TemplateListItem;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase.TemplatePage;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for GET /api/v1/workouts/templates.
 *
 * <p>Steps are omitted from the list view; clients call GET /workouts/{id}
 * for the full workout structure before use.
 */
public record WorkoutTemplateListResponse(
        List<Item> content,
        int  page,
        int  size,
        long totalElements,
        int  totalPages
) {

    public record Item(
            UUID       id,
            String     name,
            String     sport,
            String     description,
            Integer    estimatedDurationSeconds,
            BigDecimal estimatedTss,
            List<String> tags,
            String     source,
            Instant    createdAt
    ) {}

    public static WorkoutTemplateListResponse from(TemplatePage page) {
        List<Item> items = page.content().stream()
                .map(t -> new Item(
                        t.id(), t.name(), t.sport(), t.description(),
                        t.estimatedDurationSeconds(), t.estimatedTss(),
                        t.tags(), t.source(), t.createdAt()))
                .toList();
        return new WorkoutTemplateListResponse(
                items, page.page(), page.size(), page.totalElements(), page.totalPages());
    }
}
