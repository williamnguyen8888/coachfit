package com.coachfit.athlete.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Domain model for a sport zone configuration row.
 *
 * <p>Maps to {@code sport_zones} (docs/04-db-schema.md §sport_zones).
 * Each record is identified by {@code (userId, sport, zoneType, effectiveDate)}.
 */
public record SportZone(
        UUID          id,
        UUID          userId,
        String        sport,          // cycling | running | swimming
        String        zoneType,       // power | heart_rate | pace
        Integer       ftp,            // nullable — cycling FTP in watts
        Integer       lthr,           // nullable — bpm (Lactate Threshold HR)
        Integer       maxHr,          // nullable — bpm
        Integer       thresholdPace,  // nullable — sec/km (running) | sec/100m (swimming)
        Integer       css,            // nullable — Critical Swim Speed in sec/100m
        List<ZoneBand> zones,
        LocalDate     effectiveDate,
        Instant       createdAt
) {

    /**
     * A single zone band as stored in the {@code zones JSONB} column.
     *
     * @param zone 1-based zone number
     * @param name e.g. "Recovery", "Endurance", "Tempo"
     * @param min  lower bound (inclusive), watts or bpm or pace
     * @param max  upper bound (exclusive), watts or bpm or pace
     */
    public record ZoneBand(int zone, String name, int min, int max) {}
}
