package com.coachfit.activity.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Normalised activity data extracted from any supported file format (FIT/TCX/GPX).
 *
 * <p>This is the intermediate representation passed from parsers through to the
 * persistence layer. All fields except {@code sport}, {@code startedAt},
 * and {@code durationSeconds} are nullable.
 *
 * @param sport               CoachFit sport string (e.g. "cycling", "running")
 * @param subSport            sub-sport string (nullable)
 * @param name                activity name derived from file metadata
 * @param startedAt           UTC timestamp of activity start
 * @param durationSeconds     total elapsed time in seconds
 * @param movingTimeSeconds   moving time in seconds (nullable — not available in GPX)
 * @param distanceMeters      total distance (nullable)
 * @param elevationGainMeters total elevation gain (nullable)
 * @param calories            estimated calories (nullable)
 * @param avgHeartRate        average heart rate bpm (nullable)
 * @param maxHeartRate        max heart rate bpm (nullable)
 * @param avgPower            average power watts (nullable)
 * @param maxPower            max power watts (nullable)
 * @param avgCadence          average cadence rpm (nullable)
 * @param avgSpeed            average speed m/s (nullable)
 * @param startLat            start latitude decimal degrees (nullable)
 * @param startLng            start longitude decimal degrees (nullable)
 * @param laps                parsed laps (empty list if no lap data)
 * @param streams             time-series data streams
 */
public record ParsedActivity(
        String       sport,
        String       subSport,
        String       name,
        Instant      startedAt,
        int          durationSeconds,
        Integer      movingTimeSeconds,
        BigDecimal   distanceMeters,
        BigDecimal   elevationGainMeters,
        Integer      calories,
        Integer      avgHeartRate,
        Integer      maxHeartRate,
        Integer      avgPower,
        Integer      maxPower,
        Integer      avgCadence,
        BigDecimal   avgSpeed,
        Double       startLat,
        Double       startLng,
        List<ParsedLap> laps,
        ParsedStreams    streams
) {}
