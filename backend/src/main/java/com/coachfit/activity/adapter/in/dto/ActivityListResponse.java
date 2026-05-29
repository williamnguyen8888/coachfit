package com.coachfit.activity.adapter.in.dto;

import com.coachfit.activity.application.port.in.ListActivitiesUseCase.ActivityListItem;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase.ActivityPage;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * HTTP response body for {@code GET /api/v1/activities} (200 OK).
 *
 * <p>Mirrors the paginated envelope documented in docs/05-api-design.md §GET /activities.
 */
public record ActivityListResponse(
        List<Item> content,
        int  page,
        int  size,
        long totalElements,
        int  totalPages
) {

    public record Item(
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

    public static ActivityListResponse from(ActivityPage page) {
        List<Item> items = page.content().stream()
                .map(ActivityListResponse::toItem)
                .toList();
        return new ActivityListResponse(
                items, page.page(), page.size(), page.totalElements(), page.totalPages());
    }

    private static Item toItem(ActivityListItem i) {
        return new Item(
                i.id(), i.sport(), i.name(), i.startedAt(),
                i.durationSeconds(), i.distanceMeters(),
                i.avgHeartRate(), i.avgPower(), i.tss(), i.source());
    }
}
