package com.coachfit.auth.adapter.in.dto;

import java.util.UUID;

/**
 * User summary returned in auth responses.
 * Matches docs/05-api-design.md register/login response shape.
 */
public record UserDto(
        UUID   id,
        String email,
        String fullName,
        String role,
        String tier
) {}
