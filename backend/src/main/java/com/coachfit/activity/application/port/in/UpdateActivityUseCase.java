package com.coachfit.activity.application.port.in;

import java.util.UUID;

/**
 * Input port: update mutable fields of an activity
 * (PUT /api/v1/activities/{id}).
 *
 * <p>Only {@code name}, {@code description}, and {@code gearId} may be
 * changed by the user. All other fields are set by the ingestion pipeline
 * and are read-only at this surface.
 */
public interface UpdateActivityUseCase {

    /**
     * Applies a partial update to the activity.
     * Null fields in {@code command} leave the persisted values unchanged.
     *
     * @param userId     authenticated user — used for ownership verification
     * @param activityId activity to update
     * @param command    field updates (null == leave unchanged)
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found / deleted
     * @throws org.springframework.security.access.AccessDeniedException if owned by another user
     */
    void update(UUID userId, UUID activityId, UpdateCommand command);

    // ── Command ───────────────────────────────────────────────────────────────

    record UpdateCommand(
            String name,        // nullable — new name
            String description, // nullable — new description
            UUID   gearId       // nullable — new gear reference
    ) {}
}
