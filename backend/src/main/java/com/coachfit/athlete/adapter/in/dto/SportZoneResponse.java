package com.coachfit.athlete.adapter.in.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for sport zone endpoints.
 *
 * <p>Docs/05-api-design.md — zone response (implied by PUT /athlete/zones/{sport}).
 */
public record SportZoneResponse(
        String          id,
        String          sport,
        String          zoneType,
        Integer         ftp,
        Integer         lthr,
        Integer         maxHr,
        List<ZoneBandDto> zones,
        LocalDate       effectiveDate
) {
    public record ZoneBandDto(int zone, String name, int min, int max) {}
}
