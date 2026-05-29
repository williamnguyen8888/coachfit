package com.coachfit.athlete.adapter.in.dto;

import java.util.Map;

/**
 * Response DTO for {@code GET /athlete} and {@code PUT /athlete}.
 *
 * <p>Mirrors the shape defined in docs/05-api-design.md §GET /athlete.
 */
public record AthleteResponse(
        String        id,
        String        email,
        String        fullName,
        String        avatarUrl,
        String        role,
        String        tier,
        ProfileDto    profile,
        Map<String, Object> settings
) {}
