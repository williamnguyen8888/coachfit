package com.coachfit.gear.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port for all Gear management operations.
 *
 * <pre>
 * GET    /api/v1/gear           — list active gear
 * POST   /api/v1/gear           — create gear
 * PUT    /api/v1/gear/{id}      — update name/sport/type
 * DELETE /api/v1/gear/{id}      — retire (soft-delete: is_active=false)
 * </pre>
 *
 * <p>All mutating operations enforce that the gear belongs to the requesting user
 * (ownership check in the service layer).
 */
public interface GearUseCase {

    List<GearItem> listGear(UUID userId);

    GearItem createGear(UUID userId, String name, String sport, String type);

    GearItem updateGear(UUID userId, UUID gearId, String name, String sport, String type);

    void retireGear(UUID userId, UUID gearId);

    // ── Result type ──────────────────────────────────────────────────────────

    record GearItem(
            UUID       id,
            String     name,
            String     sport,
            String     type,
            boolean    isActive,
            BigDecimal totalDistanceMeters,
            Instant    createdAt
    ) {}
}
