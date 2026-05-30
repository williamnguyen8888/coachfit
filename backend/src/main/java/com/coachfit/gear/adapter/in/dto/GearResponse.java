package com.coachfit.gear.adapter.in.dto;

import com.coachfit.gear.application.port.in.GearUseCase.GearItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for a single gear item.
 *
 * <p>Returned by all gear endpoints (list, create, update).
 */
public record GearResponse(
        UUID       id,
        String     name,
        String     sport,
        String     type,
        boolean    isActive,
        BigDecimal totalDistanceMeters,
        Instant    createdAt
) {
    public static GearResponse from(GearItem item) {
        return new GearResponse(
                item.id(),
                item.name(),
                item.sport(),
                item.type(),
                item.isActive(),
                item.totalDistanceMeters(),
                item.createdAt()
        );
    }

    /** Convenience: wrap a list. */
    public static List<GearResponse> fromList(List<GearItem> items) {
        return items.stream().map(GearResponse::from).toList();
    }
}
