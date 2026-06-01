package com.coachfit.workout.adapter.in.dto;

import com.coachfit.workout.application.port.in.ListWorkoutsUseCase.WorkoutListItem;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase.WorkoutPage;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for GET /api/v1/workouts.
 *
 * <p>Steps are NOT included in the list view for performance — clients should
 * call GET /workouts/{id} to retrieve the full workout structure.
 */
public record WorkoutListResponse(
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
            Integer    estimatedDuration,
            BigDecimal estimatedTss,
            List<String> tags,
            boolean    isTemplate,
            boolean    isPublic,
            String     source,
            Instant    createdAt,
            Instant    updatedAt
    ) {}

    public static WorkoutListResponse from(WorkoutPage page) {
        List<Item> items = page.content().stream()
                .map(w -> new Item(
                        w.id(), w.name(), w.sport(), w.description(),
                        w.estimatedDurationSeconds(), w.estimatedDurationSeconds(), w.estimatedTss(),
                        w.tags(), w.isTemplate(), w.isPublic(), w.source(),
                        w.createdAt(), w.updatedAt()))
                .toList();
        return new WorkoutListResponse(
                items, page.page(), page.size(), page.totalElements(), page.totalPages());
    }
}
