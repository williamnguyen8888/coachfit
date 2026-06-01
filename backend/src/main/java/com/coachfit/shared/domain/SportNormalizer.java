package com.coachfit.shared.domain;

import java.util.Locale;
import java.util.Set;

/**
 * Canonical sport matching used across calendar/workout/activity link logic.
 */
public final class SportNormalizer {

    private static final Set<String> CYCLING = Set.of(
            "cycling", "ride", "virtualride", "virtual_ride", "indoor_cycling",
            "mountain_biking", "gravel_cycling", "road_biking", "e_bike_fitness",
            "cycling_commute", "bike"
    );

    private static final Set<String> RUNNING = Set.of(
            "running", "run", "virtualrun", "virtual_run", "trailrun", "trail_run",
            "trail_running", "track_running", "indoor_running"
    );

    private static final Set<String> SWIMMING = Set.of(
            "swimming", "swim", "openwaterswim", "openwater_swim", "open_water_swimming",
            "pool_swimming"
    );

    private static final Set<String> STRENGTH = Set.of(
            "strength", "gym", "strengthtraining", "strength_training", "functional_strength",
            "weighttraining", "weight_training", "weights", "workout", "fitness", "crossfit",
            "hiit", "yoga", "pilates"
    );

    private SportNormalizer() {
    }

    public static String canonical(String sport) {
        String normalized = normalizeToken(sport);
        if (normalized.isBlank()) {
            return "other";
        }
        if (CYCLING.contains(normalized)) {
            return "cycling";
        }
        if (RUNNING.contains(normalized)) {
            return "running";
        }
        if (SWIMMING.contains(normalized)) {
            return "swimming";
        }
        if (STRENGTH.contains(normalized)) {
            return "strength";
        }
        return normalized;
    }

    public static boolean sameSport(String left, String right) {
        return canonical(left).equals(canonical(right));
    }

    private static String normalizeToken(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
    }
}
