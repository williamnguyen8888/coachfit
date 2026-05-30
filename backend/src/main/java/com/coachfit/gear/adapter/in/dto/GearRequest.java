package com.coachfit.gear.adapter.in.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/v1/gear and PUT /api/v1/gear/{id}.
 */
public record GearRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 50) String sport,
        @Size(max = 50) String type    // bike / shoes / wetsuit / other
) {}
