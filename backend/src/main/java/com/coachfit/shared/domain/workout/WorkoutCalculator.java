package com.coachfit.shared.domain.workout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility to parse steps JSON and calculate estimated duration, training load (TSS), and distance.
 */
public class WorkoutCalculator {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record CalculationResult(int durationSeconds, java.math.BigDecimal tss, double distanceMeters, int averageIntensity) {}

    public static CalculationResult calculate(String stepsJson, String sport) {
        if (stepsJson == null || stepsJson.isBlank()) {
            return new CalculationResult(0, BigDecimal.ZERO, 0.0, 70);
        }
        try {
            JsonNode root = MAPPER.readTree(stepsJson);
            if (!root.isArray()) {
                return new CalculationResult(0, BigDecimal.ZERO, 0.0, 70);
            }
            double totalDuration = 0;
            double totalTss = 0;
            double totalDistance = 0;
            double totalIntensityWeighted = 0;
            boolean hasDistanceStep = false;

            for (JsonNode step : root) {
                CalculationResult stepRes = calculateStep(step, sport);
                totalDuration += stepRes.durationSeconds();
                totalTss += stepRes.tss().doubleValue();
                totalIntensityWeighted += stepRes.averageIntensity() * stepRes.durationSeconds();
                
                // Track if we had any explicit distance-based steps
                if (stepRes.distanceMeters() > 0) {
                    totalDistance += stepRes.distanceMeters();
                    hasDistanceStep = true;
                }
            }

            // If no step had an explicit distance, use duration heuristic matching the frontend
            if (!hasDistanceStep && totalDuration > 0) {
                totalDistance = getHeuristicDistance(totalDuration, sport);
            }

            int avgIntensity = totalDuration > 0 ? (int) Math.round(totalIntensityWeighted / totalDuration) : 70;

            return new CalculationResult(
                    (int) Math.round(totalDuration),
                    BigDecimal.valueOf(totalTss).setScale(2, RoundingMode.HALF_UP),
                    totalDistance,
                    avgIntensity
            );
        } catch (Exception e) {
            // Fallback on JSON parse errors
            return new CalculationResult(0, BigDecimal.ZERO, 0.0, 70);
        }
    }

    private static CalculationResult calculateStep(JsonNode step, String sport) {
        String type = step.has("type") ? step.get("type").asText() : "work";
        if ("repeat".equals(type)) {
            int count = step.has("count") ? step.get("count").asInt() : 1;
            double innerDuration = 0;
            double innerTss = 0;
            double innerDistance = 0;
            double innerIntensityWeighted = 0;
            if (step.has("steps") && step.get("steps").isArray()) {
                for (JsonNode inner : step.get("steps")) {
                    CalculationResult innerRes = calculateStep(inner, sport);
                    innerDuration += innerRes.durationSeconds();
                    innerTss += innerRes.tss().doubleValue();
                    innerDistance += innerRes.distanceMeters();
                    innerIntensityWeighted += innerRes.averageIntensity() * innerRes.durationSeconds();
                }
            }
            double stepDur = innerDuration * count;
            int stepAvgIntensity = innerDuration > 0 ? (int) Math.round(innerIntensityWeighted / innerDuration) : 70;
            return new CalculationResult(
                    (int) Math.round(stepDur),
                    BigDecimal.valueOf(innerTss * count),
                    innerDistance * count,
                    stepAvgIntensity
            );
        }

        // Leaf step duration and distance
        double duration = 0;
        double distance = 0;
        if (step.has("duration") && !step.get("duration").isNull()) {
            JsonNode dur = step.get("duration");
            String durType = dur.has("type") ? dur.get("type").asText() : "time";
            if ("time".equals(durType)) {
                duration = dur.has("value") && !dur.get("value").isNull() ? dur.get("value").asDouble() : 300.0;
            } else if ("distance".equals(durType)) {
                distance = dur.has("value") && !dur.get("value").isNull() ? dur.get("value").asDouble() : 1000.0;
                double speed = getDefaultSpeed(sport);
                duration = distance / speed;
            } else {
                duration = 300.0; // default for calories or other lap_button steps
            }
        } else {
            duration = 300.0;
        }

        // Leaf step intensity factor (IF) estimation
        double ifValue = 0.70; // default aerobic intensity
        if (step.has("target") && !step.get("target").isNull()) {
            JsonNode target = step.get("target");
            String targetType = target.has("type") ? target.get("type").asText() : "open";
            switch (targetType) {
                case "power_zone", "hr_zone", "pace_zone" -> {
                    int zone = target.has("zone") ? target.get("zone").asInt() : 2;
                    ifValue = getZoneIf(zone);
                }
                case "power_pct", "hr_pct", "hr_bpm", "power_watts", "pace", "rpe", "cadence" -> {
                    double min = target.has("min") && !target.get("min").isNull() ? target.get("min").asDouble() : 0.0;
                    double max = target.has("max") && !target.get("max").isNull() ? target.get("max").asDouble() : 0.0;
                    ifValue = estimateIfForType(targetType, min, max, sport);
                }
                default -> ifValue = 0.70;
            }
        } else {
            if ("warmup".equals(type) || "cooldown".equals(type) || "rest".equals(type)) {
                ifValue = 0.50; // Zone 1
            } else if ("work".equals(type)) {
                ifValue = 0.75;
            } else {
                ifValue = 0.65; // Zone 2
            }
        }

        // TSS = (duration * IF^2 * 100) / 3600
        double tss = (duration * ifValue * ifValue * 100.0) / 3600.0;
        return new CalculationResult((int) Math.round(duration), BigDecimal.valueOf(tss), distance, (int) Math.round(ifValue * 100));
    }

    private static double estimateIfForType(String targetType, double min, double max, String sport) {
        double avg = (min + max) / 2.0;
        if (avg <= 0) return 0.70;

        return switch (targetType) {
            case "power_pct", "hr_pct" -> avg;
            case "power_watts" -> avg / 250.0; // reference to 250W FTP
            case "hr_bpm" -> avg / 160.0; // reference to 160 bpm LTHR
            case "pace" -> {
                // Running pace (sec/km): threshold pace reference is 270 sec/km (4:30/km)
                // Speed is inversely proportional to pace: IF = ThresholdPace / AvgPace
                yield 270.0 / avg;
            }
            case "rpe", "cadence" -> {
                // RPE maps 1-10 to 0.1-1.0 IF (cadence is repurposed as RPE in older client DTOs)
                yield avg / 10.0;
            }
            default -> 0.70;
        };
    }

    private static double getDefaultSpeed(String sport) {
        if (sport == null) return 3.33;
        return switch (sport.toLowerCase()) {
            case "cycling" -> 8.33; // 30 km/h = 8.33 m/s
            case "running" -> 3.33; // 12 km/h = 3.33 m/s (~5:00 min/km)
            case "swimming" -> 0.83; // 1:20/100m = 1.25 m/s (~1.5 min/100m = 1.11 m/s, let's use 0.83 m/s = 2:00/100m)
            default -> 3.33;
        };
    }

    private static double getZoneIf(int zone) {
        return switch (zone) {
            case 1 -> 0.55;
            case 2 -> 0.65;
            case 3 -> 0.80;
            case 4 -> 0.95;
            case 5 -> 1.05;
            case 6 -> 1.20;
            case 7 -> 1.40;
            default -> 0.70;
        };
    }

    private static double getHeuristicDistance(double durationSeconds, String sport) {
        if (sport == null) return 0.0;
        return switch (sport.toLowerCase()) {
            case "swimming" -> (durationSeconds / 2400.0) * 1400.0;
            case "cycling" -> (durationSeconds / 3600.0) * 28000.0;
            case "running" -> (durationSeconds / 2700.0) * 7500.0;
            default -> 0.0;
        };
    }
}
