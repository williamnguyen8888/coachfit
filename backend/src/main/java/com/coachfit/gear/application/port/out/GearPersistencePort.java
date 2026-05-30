package com.coachfit.gear.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: gear persistence.
 *
 * <p>{@code recalculateTotalDistance} is called after any activity
 * create/update/delete or gear_id change.
 */
public interface GearPersistencePort {

    UUID save(UUID userId, String name, String sport, String type);

    Optional<GearSummary> findById(UUID gearId);

    List<GearSummary> findActiveByUserId(UUID userId);

    /**
     * Recalculates {@code total_distance_meters} from non-deleted activities.
     * Runs: {@code UPDATE gear SET total_distance_meters = (SELECT COALESCE(SUM(...)))}
     */
    void recalculateTotalDistance(UUID gearId);

    void retire(UUID gearId);   // sets is_active = false

    /**
     * Updates mutable fields of a gear item (name, sport, type).
     * Ownership must be verified by the caller before invoking this.
     */
    void update(UUID gearId, String name, String sport, String type);

    // ── Read model ───────────────────────────────────────────────────────────

    record GearSummary(
            UUID       id,
            UUID       userId,
            String     name,
            String     sport,
            String     type,
            boolean    isActive,
            BigDecimal totalDistanceMeters,
            Instant    createdAt
    ) {}
}
