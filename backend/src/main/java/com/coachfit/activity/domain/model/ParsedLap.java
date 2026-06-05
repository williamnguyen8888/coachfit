package com.coachfit.activity.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Per-lap data extracted from a parsed activity file.
 * Matches the {@code activity_laps} table schema.
 *
 * @param lapIndex        0-based lap index
 * @param startTime       absolute timestamp of lap start (nullable)
 * @param durationSeconds lap elapsed time in seconds
 * @param distanceMeters  lap distance (nullable)
 * @param avgHeartRate    avg HR in bpm (nullable)
 * @param maxHeartRate    max HR in bpm (nullable)
 * @param avgPower        avg power in watts (nullable)
 * @param maxPower        max power in watts (nullable)
 * @param normalizedPower normalized power in watts (nullable)
 * @param avgCadence      avg cadence in rpm (nullable)
 * @param avgPace         avg pace in seconds/meter (nullable)
 * @param maxSpeed        max speed in m/s (nullable)
 * @param elevationGain   elevation gain in meters (nullable)
 * @param elevationDescent elevation descent in meters (nullable)
 * @param lapTrigger      what triggered the lap — "manual", "distance", "time", "auto" (nullable)
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
        Integer      normalizedPower,
        Integer      avgCadence,
        BigDecimal   avgPace,
        BigDecimal   maxSpeed,
        BigDecimal   elevationGain,
        BigDecimal   elevationDescent,
        String       lapTrigger
) {}
