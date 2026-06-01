package com.coachfit.workout.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Validates the {@code steps} JSONB structure for a workout against the rules
 * defined in docs/07-workout-data-model.md.
 *
 * <h2>Rules</h2>
 * <ul>
 *   <li>steps array must not be empty (length &ge; 1)</li>
 *   <li>Valid step types: warmup, work, rest, cooldown, repeat, ramp, free</li>
 *   <li>{@code repeat} steps must have a {@code count} (1–99) and a non-empty {@code steps[]} array</li>
 *   <li>Max nesting depth is 1 — no repeat inside repeat</li>
 *   <li>Non-repeat steps must have a {@code duration} object with {@code type} and (usually) {@code value}</li>
 *   <li>Duration {@code value} must be &gt; 0 (when required)</li>
 *   <li>Target validation (when present):
 *     <ul>
 *       <li>power_zone: zone in 1–7</li>
 *       <li>power_pct: 0.0 &le; min &le; max &le; 3.0</li>
 *       <li>power_watts: 0 &le; min &le; max &le; 2000</li>
 *       <li>hr_zone: zone in 1–5</li>
 *       <li>hr_pct / hr_bpm: min &le; max, HR 40–250 bpm</li>
 *       <li>pace_zone: zone in 1–5</li>
 *       <li>pace: min &le; max, both &gt; 0 sec/km</li>
 *       <li>rpe: 1 &le; min &le; max &le; 10</li>
 *     </ul>
 *   </li>
 * </ul>
 */
@Component
public class WorkoutStepsValidator {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final List<String> VALID_STEP_TYPES =
            List.of("warmup", "work", "rest", "cooldown", "repeat", "ramp", "free");

    private static final List<String> VALID_DURATION_TYPES =
            List.of("time", "distance", "calories", "lap_button", "hr_above", "hr_below");

    /**
     * Validates the JSON string representing a workout's {@code steps} array.
     *
     * @param stepsJson raw JSON string from the client
     * @throws WorkoutValidationException if the JSON is invalid or violates a structural rule
     */
    public void validate(String stepsJson) {
        if (stepsJson == null || stepsJson.isBlank()) {
            throw new WorkoutValidationException("steps must not be null or empty");
        }

        JsonNode root;
        try {
            root = MAPPER.readTree(stepsJson);
        } catch (Exception e) {
            throw new WorkoutValidationException("steps is not valid JSON: " + e.getMessage());
        }

        if (!root.isArray()) {
            throw new WorkoutValidationException("steps must be a JSON array");
        }
        if (root.isEmpty()) {
            throw new WorkoutValidationException("steps must not be empty");
        }

        // Validate top-level steps (depth 0)
        for (int i = 0; i < root.size(); i++) {
            validateStep(root.get(i), i, false);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateStep(JsonNode step, int index, boolean insideRepeat) {
        String prefix = "steps[" + index + "]";

        String type = requireString(step, "type", prefix);
        if (!VALID_STEP_TYPES.contains(type)) {
            throw new WorkoutValidationException(prefix + ".type must be one of " + VALID_STEP_TYPES + ", got: " + type);
        }

        if ("repeat".equals(type)) {
            if (insideRepeat) {
                throw new WorkoutValidationException(prefix + ": repeat steps cannot be nested inside another repeat (max depth 1)");
            }
            validateRepeatStep(step, prefix);
        } else {
            validateLeafStep(step, prefix);
        }
    }

    private void validateRepeatStep(JsonNode step, String prefix) {
        JsonNode countNode = step.get("count");
        if (countNode == null || !countNode.isInt()) {
            throw new WorkoutValidationException(prefix + ".count must be an integer");
        }
        int count = countNode.intValue();
        if (count < 1 || count > 99) {
            throw new WorkoutValidationException(prefix + ".count must be between 1 and 99, got: " + count);
        }

        JsonNode nestedSteps = step.get("steps");
        if (nestedSteps == null || !nestedSteps.isArray()) {
            throw new WorkoutValidationException(prefix + ".steps must be an array for repeat steps");
        }
        if (nestedSteps.isEmpty()) {
            throw new WorkoutValidationException(prefix + ".steps must not be empty for repeat steps");
        }

        for (int i = 0; i < nestedSteps.size(); i++) {
            validateStep(nestedSteps.get(i), i, true);
        }
    }

    private void validateLeafStep(JsonNode step, String prefix) {
        // Duration is required on non-repeat steps
        JsonNode duration = step.get("duration");
        if (duration == null) {
            throw new WorkoutValidationException(prefix + ".duration is required");
        }

        String durType = requireString(duration, "type", prefix + ".duration");
        if (!VALID_DURATION_TYPES.contains(durType)) {
            throw new WorkoutValidationException(prefix + ".duration.type must be one of "
                    + VALID_DURATION_TYPES + ", got: " + durType);
        }

        // lap_button has no value; others require value > 0
        if (!"lap_button".equals(durType)) {
            JsonNode valueNode = duration.get("value");
            if (valueNode == null || valueNode.isNull()) {
                throw new WorkoutValidationException(prefix + ".duration.value is required for type: " + durType);
            }
            if (!valueNode.isNumber() || valueNode.doubleValue() <= 0) {
                throw new WorkoutValidationException(prefix + ".duration.value must be > 0, got: " + valueNode);
            }
        }

        // Target is optional, but if present, validate it
        JsonNode target = step.get("target");
        if (target != null && !target.isNull()) {
            validateTarget(target, prefix + ".target");
        }
    }

    private void validateTarget(JsonNode target, String prefix) {
        String type = requireString(target, "type", prefix);

        switch (type) {
            case "power_zone" -> {
                int zone = requireIntInRange(target, "zone", 1, 7, prefix);
            }
            case "power_pct" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 0 || max > 3.0 || min > max) {
                    throw new WorkoutValidationException(prefix + ": power_pct requires 0 <= min <= max <= 3.0");
                }
            }
            case "power_watts" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 0 || max > 2000 || min > max) {
                    throw new WorkoutValidationException(prefix + ": power_watts requires 0 <= min <= max <= 2000");
                }
            }
            case "hr_zone" -> {
                requireIntInRange(target, "zone", 1, 5, prefix);
            }
            case "hr_pct" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 0 || max > 2.0 || min > max) {
                    throw new WorkoutValidationException(prefix + ": hr_pct requires 0 <= min <= max <= 2.0 (% LTHR)");
                }
            }
            case "hr_bpm" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 40 || max > 250 || min > max) {
                    throw new WorkoutValidationException(prefix + ": hr_bpm requires 40 <= min <= max <= 250");
                }
            }
            case "pace_zone" -> {
                requireIntInRange(target, "zone", 1, 5, prefix);
            }
            case "pace" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min <= 0 || max <= 0 || min > max) {
                    throw new WorkoutValidationException(prefix + ": pace requires 0 < min <= max (sec/km)");
                }
            }
            case "speed" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 0 || min > max) {
                    throw new WorkoutValidationException(prefix + ": speed requires 0 <= min <= max (km/h)");
                }
            }
            case "rpe" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 1 || max > 10 || min > max) {
                    throw new WorkoutValidationException(prefix + ": rpe requires 1 <= min <= max <= 10");
                }
            }
            case "cadence" -> {
                double min = requireDouble(target, "min", prefix);
                double max = requireDouble(target, "max", prefix);
                if (min < 0 || max > 250 || min > max) {
                    throw new WorkoutValidationException(prefix + ": cadence requires 0 <= min <= max <= 250");
                }
            }
            case "open" -> { /* no additional fields required */ }
            default -> throw new WorkoutValidationException(prefix + ".type unknown target type: " + type);
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static String requireString(JsonNode node, String field, String prefix) {
        JsonNode f = node.get(field);
        if (f == null || f.isNull() || !f.isTextual() || f.textValue().isBlank()) {
            throw new WorkoutValidationException(prefix + "." + field + " is required and must be a non-blank string");
        }
        return f.textValue();
    }

    private static double requireDouble(JsonNode node, String field, String prefix) {
        JsonNode f = node.get(field);
        if (f == null || f.isNull() || !f.isNumber()) {
            throw new WorkoutValidationException(prefix + "." + field + " is required and must be a number");
        }
        return f.doubleValue();
    }

    private static int requireIntInRange(JsonNode node, String field, int min, int max, String prefix) {
        JsonNode f = node.get(field);
        if (f == null || f.isNull() || !f.isInt()) {
            throw new WorkoutValidationException(prefix + "." + field + " is required and must be an integer");
        }
        int v = f.intValue();
        if (v < min || v > max) {
            throw new WorkoutValidationException(prefix + "." + field + " must be between " + min + " and " + max + ", got: " + v);
        }
        return v;
    }
}
