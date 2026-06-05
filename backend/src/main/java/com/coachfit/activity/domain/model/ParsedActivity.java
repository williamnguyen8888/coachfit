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
 * @param sport                       CoachFit sport string (e.g. "cycling", "running")
 * @param subSport                    sub-sport string (nullable)
 * @param name                        activity name derived from file metadata
 * @param startedAt                   UTC timestamp of activity start
 * @param durationSeconds             total elapsed time in seconds
 * @param movingTimeSeconds           moving time in seconds (nullable — not available in GPX)
 * @param distanceMeters              total distance (nullable)
 * @param elevationGainMeters         total elevation gain (nullable)
 * @param totalDescentMeters          total elevation descent (nullable)
 * @param calories                    estimated calories (nullable)
 * @param avgHeartRate                average heart rate bpm (nullable)
 * @param maxHeartRate                max heart rate bpm (nullable)
 * @param avgPower                    average power watts (nullable)
 * @param maxPower                    max power watts (nullable)
 * @param normalizedPower             normalized power watts (nullable)
 * @param intensityFactor             intensity factor (nullable)
 * @param tss                         training stress score (nullable)
 * @param avgCadence                  average cadence rpm (nullable)
 * @param avgSpeed                    average speed m/s (nullable)
 * @param maxSpeed                    max speed m/s (nullable)
 * @param avgTemperature              average temperature °C (nullable)
 * @param minAltitude                 minimum altitude meters (nullable)
 * @param maxAltitude                 maximum altitude meters (nullable)
 * @param aerobicTrainingEffect       Garmin aerobic training effect 0.0–5.0 (nullable)
 * @param anaerobicTrainingEffect     Garmin anaerobic training effect 0.0–5.0 (nullable)
 * @param avgVerticalOscillation      running vertical oscillation mm (nullable)
 * @param avgGroundContactTime        running ground contact time ms (nullable)
 * @param avgStepLength               running avg step/stride length mm (nullable)
 * @param avgVerticalRatio            running vertical ratio % (nullable)
 * @param leftRightBalance            cycling left-right power balance % (nullable)
 * @param avgLeftPedalSmoothness      cycling left pedal smoothness % (nullable)
 * @param avgLeftTorqueEffectiveness  cycling left torque effectiveness % (nullable)
 * @param poolLength                  swimming pool length meters (nullable)
 * @param swimStroke                  swimming stroke type (nullable)
 * @param avgSwolf                    swimming SWOLF score (nullable)
 * @param startLat                    start latitude decimal degrees (nullable)
 * @param startLng                    start longitude decimal degrees (nullable)
 * @param laps                        parsed laps (empty list if no lap data)
 * @param streams                     time-series data streams
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
        BigDecimal   totalDescentMeters,
        Integer      calories,
        Integer      avgHeartRate,
        Integer      maxHeartRate,
        Integer      avgPower,
        Integer      maxPower,
        Integer      normalizedPower,
        BigDecimal   intensityFactor,
        BigDecimal   tss,
        Integer      avgCadence,
        BigDecimal   avgSpeed,
        BigDecimal   maxSpeed,
        Integer      avgTemperature,
        BigDecimal   minAltitude,
        BigDecimal   maxAltitude,
        BigDecimal   aerobicTrainingEffect,
        BigDecimal   anaerobicTrainingEffect,
        BigDecimal   avgVerticalOscillation,
        BigDecimal   avgGroundContactTime,
        BigDecimal   avgStepLength,
        BigDecimal   avgVerticalRatio,
        BigDecimal   leftRightBalance,
        BigDecimal   avgLeftPedalSmoothness,
        BigDecimal   avgLeftTorqueEffectiveness,
        BigDecimal   poolLength,
        String       swimStroke,
        BigDecimal   avgSwolf,
        Double       startLat,
        Double       startLng,
        List<ParsedLap>  laps,
        ParsedStreams     streams
) {}
