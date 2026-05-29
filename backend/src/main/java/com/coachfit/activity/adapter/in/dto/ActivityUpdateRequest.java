package com.coachfit.activity.adapter.in.dto;

import java.util.UUID;

/**
 * HTTP request body for {@code PUT /api/v1/activities/{id}} (200 OK).
 *
 * <p>All fields are nullable — a null value means "leave unchanged".
 * Only the editable fields (name, description, gearId) are accepted;
 * all other activity fields are set by the ingestion pipeline and are read-only.
 */
public record ActivityUpdateRequest(
        String name,        // nullable — new activity name
        String description, // nullable — new description
        UUID   gearId       // nullable — new gear reference
) {}
