package com.coachfit.athlete.adapter.in.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Request body for {@code PUT /athlete/zones/{sport}}.
 */
public record UpsertSportZoneRequest(
        @NotBlank(message = "zoneType is required")
        String zoneType,

        @Positive(message = "ftp must be positive")
        Integer ftp,

        @Positive(message = "lthr must be positive")
        @Max(value = 250, message = "lthr must be ≤ 250 bpm")
        Integer lthr,

        @Positive(message = "maxHr must be positive")
        @Max(value = 250, message = "maxHr must be ≤ 250 bpm")
        Integer maxHr,

        @NotEmpty(message = "zones must not be empty")
        @Valid
        List<ZoneBandRequest> zones,

        LocalDate effectiveDate
) {
    public record ZoneBandRequest(
            @Min(value = 1, message = "zone number must be ≥ 1")
            int zone,

            @NotBlank(message = "zone name is required")
            String name,

            @Min(value = 0, message = "min must be ≥ 0")
            int min,

            @Min(value = 1, message = "max must be ≥ 1")
            int max
    ) {}
}
