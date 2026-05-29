package com.coachfit.athlete.application.port.in;

import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.athlete.domain.model.SportZone.ZoneBand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Use case: create or update sport zones for a given sport.
 *
 * <p>Docs: {@code PUT /api/v1/athlete/zones/{sport}} — tier: free.
 * Upserts on {@code (userId, sport, zoneType, effectiveDate)}.
 */
public interface UpsertSportZoneUseCase {

    SportZone upsert(UpsertCommand command);

    record UpsertCommand(
            UUID   userId,

            @NotBlank
            String sport,           // cycling | running | swimming

            @NotBlank
            String zoneType,        // power | heart_rate | pace

            @Positive
            Integer ftp,            // nullable

            @Positive @Max(250)
            Integer lthr,           // nullable

            @Positive @Max(250)
            Integer maxHr,          // nullable

            @NotEmpty @Valid
            List<ZoneBandInput> zones,

            @NotNull
            LocalDate effectiveDate
    ) {}

    /**
     * Input shape for a single zone band; mirrors the domain {@link ZoneBand}.
     */
    record ZoneBandInput(
            @Min(1) int    zone,
            @NotBlank String name,
            @Min(0)  int    min,
            @Min(1)  int    max
    ) {}
}
