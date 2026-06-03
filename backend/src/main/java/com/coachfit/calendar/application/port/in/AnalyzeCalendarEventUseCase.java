package com.coachfit.calendar.application.port.in;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Use case for analyzing the compliance between a planned workout and its linked completed activity.
 */
public interface AnalyzeCalendarEventUseCase {

    CalendarEventAnalysis analyze(UUID userId, UUID eventId);

    record CalendarEventAnalysis(
            UUID eventId,
            UUID workoutId,
            UUID activityId,
            String title,
            String sport,
            BigDecimal complianceScore,
            SummaryComparison summary,
            List<StepAnalysis> steps,
            MetricsAnalysis metrics,
            CoachingFeedback coaching
    ) {}

    record SummaryComparison(
            Integer plannedDuration, // seconds
            Integer actualDuration, // seconds
            BigDecimal durationCompliance, // percentage (0-100)

            Double plannedDistance, // meters
            Double actualDistance, // meters
            BigDecimal distanceCompliance, // percentage (0-100)

            BigDecimal plannedTss,
            BigDecimal actualTss,
            BigDecimal tssCompliance,

            Integer plannedAvgIntensity, // IF (intensity factor) estimated
            Integer actualAvgIntensity,
            BigDecimal intensityCompliance
    ) {}

    record StepAnalysis(
            int stepIndex,
            String stepType, // warmup, work, recovery, cooldown, rest, repeat
            String name,
            String targetType, // power_zone, hr_zone, pace_zone, hr_pct, power_pct, hr_bpm, power_watts, pace, rpe, cadence, open
            String targetValueStr, // e.g., "150-180W", "140-150bpm", "4:30-4:45/km"

            Integer plannedDuration, // seconds
            Double plannedDistance, // meters

            Integer actualDuration,
            Double actualDistance,
            Integer actualAvgHr,
            Integer actualAvgPower,
            Double actualAvgSpeed, // m/s
            String actualAvgPaceStr, // formatted e.g., "4:35/km"

            BigDecimal durationCompliance,
            BigDecimal intensityCompliance,
            BigDecimal stepCompliance, // average of duration + intensity for this step
            Boolean isTargetMet,
            Integer heartRateRecovery
    ) {}

    record MetricsAnalysis(
            List<ZoneDistributionMatch> zoneMatches
    ) {}

    record ZoneDistributionMatch(
            int zone, // 1 to 5 or 7
            String zoneName, // e.g. "Recovery", "Aerobic", "Tempo", "Threshold", "VO2 Max"
            Double plannedPct,
            Double actualPct
    ) {}

    record CoachingFeedback(
            String rating, // EXCELLENT, GOOD, INCONSISTENT, UNDERACHIEVED, OVERACHIEVED
            String summary,
            String pacingFeedback,
            String durationFeedback,
            List<String> recommendations
    ) {}
}
