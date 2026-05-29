package com.coachfit.activity.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Per-lap data extracted from a parsed activity file.
 * Matches the {@code activity_laps} table schema.
 *
 * @param lapIndex       0-based lap index
 * @param startTime      absolute timestamp of lap start (nullable)
 * @param durationSeconds lap elapsed time in seconds
 * @param distanceMeters lap distance (nullable)
 * @param avgHeartRate   avg HR in bpm (nullable)
 * @param maxHeartRate   max HR in bpm (nullable)
 * @param avgPower       avg power in watts (nullable)
 * @param maxPower       max power in watts (nullable)
 * @param avgCadence     avg cadence in rpm (nullable)
 * @param avgPace        avg pace in seconds/meter (nullable)
 * @param elevationGain  elevation gain in meters (nullable)
 */
public record ParsedLap(
        int          lapIndex,
        Instant      startTime,
        Integer      durationSeconds,
        BigDecimal   distanceMeters,
        Integer      avgHeartRate,
        Integer      maxHeartRate,
        Integer      avgPower,
        Integer      maxPower,
        Integer      avgCadence,
        BigDecimal   avgPace,
        BigDecimal   elevationGain
) {}
