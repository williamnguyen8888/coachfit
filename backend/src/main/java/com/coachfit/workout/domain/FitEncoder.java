package com.coachfit.workout.domain;

import com.coachfit.workout.application.port.in.GetWorkoutUseCase.WorkoutDetail;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.garmin.fit.BufferEncoder;
import com.garmin.fit.DateTime;
import com.garmin.fit.File;
import com.garmin.fit.FileIdMesg;
import com.garmin.fit.Fit;
import com.garmin.fit.Intensity;
import com.garmin.fit.Manufacturer;
import com.garmin.fit.Sport;
import com.garmin.fit.WktStepDuration;
import com.garmin.fit.WktStepTarget;
import com.garmin.fit.WorkoutMesg;
import com.garmin.fit.WorkoutStepMesg;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Domain service that encodes a {@link WorkoutDetail} into a binary Garmin .FIT file.
 *
 * <h2>Mapping strategy (docs/07-workout-data-model.md §FIT File Export)</h2>
 * <ul>
 *   <li>Repeat steps are flattened: inner steps first, followed by a
 *       {@code REPEAT_UNTIL_STEPS_CMPLT} sentinel step.</li>
 *   <li>Zone-relative targets ({@code power_zone}, {@code hr_zone}, {@code pace_zone}) are
 *       passed through as zone references; the device resolves them against its zone tables.</li>
 *   <li>Percentage-based targets ({@code power_pct}, {@code hr_pct}) are converted to absolute
 *       watts/bpm using the FTP/LTHR values supplied in the {@link ZoneContext}.</li>
 *   <li>Absolute targets ({@code power_watts}, {@code hr_bpm}, {@code pace}, {@code speed})
 *       are encoded directly.</li>
 * </ul>
 *
 * <p>FIT Profile unit conventions:
 * <ul>
 *   <li>Power  : watts</li>
 *   <li>HR     : bpm</li>
 *   <li>Speed  : mm/s (1 m/s = 1000 mm/s)</li>
 *   <li>Time   : milliseconds</li>
 *   <li>Distance: centimeters</li>
 * </ul>
 *
 * <p>This class has no dependency on any other CoachFit module ({@code athlete}, {@code sync},
 * etc.) to keep it self-contained and testable in isolation.
 */
@Component
public class FitEncoder {

    private static final Logger log = LoggerFactory.getLogger(FitEncoder.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Arbitrary manufacturer serial number for generated FIT files. */
    private static final long SERIAL_NUMBER = 0xC0ACF170L;

    /**
     * Encodes the workout into binary FIT content using an in-memory {@link BufferEncoder}.
     *
     * @param workout     full workout detail (steps stored as JSONB string)
     * @param zoneContext FTP and LTHR values for resolving percentage-based targets
     * @return binary content of the encoded .FIT file
     * @throws WorkoutValidationException if the workout steps JSON cannot be parsed
     */
    public byte[] encode(WorkoutDetail workout, ZoneContext zoneContext) {
        JsonNode stepsRoot = parseSteps(workout.stepsJson());
        List<WorkoutStepMesg> flatSteps = flattenSteps(stepsRoot, zoneContext);

        BufferEncoder encoder = new BufferEncoder(Fit.ProtocolVersion.V2_0);
        encoder.open();

        // 1. FileIdMesg — must be first
        FileIdMesg fileId = new FileIdMesg();
        fileId.setType(File.WORKOUT);
        fileId.setManufacturer(Manufacturer.DEVELOPMENT);
        fileId.setProduct(0);
        fileId.setSerialNumber(SERIAL_NUMBER);
        fileId.setTimeCreated(new DateTime(
                Date.from(workout.updatedAt() != null ? workout.updatedAt() : workout.createdAt())));
        encoder.write(fileId);

        // 2. WorkoutMesg — workout summary
        WorkoutMesg workoutMesg = new WorkoutMesg();
        workoutMesg.setWktName(truncate(workout.name(), 16));
        workoutMesg.setSport(toFitSport(workout.sport()));
        workoutMesg.setNumValidSteps(flatSteps.size());
        encoder.write(workoutMesg);

        // 3. WorkoutStepMesgs — one per flattened step (repeat sentinels included)
        for (WorkoutStepMesg step : flatSteps) {
            encoder.write(step);
        }

        byte[] bytes = encoder.close();
        log.debug("FIT encoded: workout={} steps={} bytes={}", workout.id(), flatSteps.size(), bytes.length);
        return bytes;
    }

    // ── Step flattening ───────────────────────────────────────────────────────

    /**
     * Flattens the step tree into a sequential list with repeat sentinels inserted.
     * Message indices are assigned after the full list is built (0-based).
     */
    private List<WorkoutStepMesg> flattenSteps(JsonNode stepsArray, ZoneContext ctx) {
        List<WorkoutStepMesg> result = new ArrayList<>();

        for (JsonNode stepNode : stepsArray) {
            String type = stepNode.get("type").asText();
            if ("repeat".equals(type)) {
                expandRepeat(stepNode, result, ctx);
            } else {
                result.add(buildLeafStep(stepNode, ctx));
            }
        }

        // Assign sequential 0-based message indices in final order
        for (int i = 0; i < result.size(); i++) {
            result.get(i).setMessageIndex(i);
        }
        return result;
    }

    /**
     * Expands a {@code repeat} step: [inner steps…] + REPEAT sentinel.
     *
     * <p>The sentinel uses {@code REPEAT_UNTIL_STEPS_CMPLT} with:
     * <ul>
     *   <li>{@code durationValue} = message_index of the first inner step</li>
     *   <li>{@code targetValue}   = repeat count</li>
     * </ul>
     */
    private void expandRepeat(JsonNode repeatNode,
                               List<WorkoutStepMesg> result,
                               ZoneContext ctx) {
        int repeatCount   = repeatNode.get("count").asInt();
        int firstInnerIdx = result.size();

        // Inner steps — added before the sentinel
        for (JsonNode inner : repeatNode.get("steps")) {
            result.add(buildLeafStep(inner, ctx));
        }

        // Sentinel step (not a real workout step — just a "go back" instruction)
        WorkoutStepMesg sentinel = new WorkoutStepMesg();
        sentinel.setDurationType(WktStepDuration.REPEAT_UNTIL_STEPS_CMPLT);
        sentinel.setDurationValue((long) firstInnerIdx);  // back-pointer to first inner step
        sentinel.setTargetType(WktStepTarget.OPEN);
        sentinel.setTargetValue((long) repeatCount);      // number of repetitions
        sentinel.setCustomTargetValueLow(0L);
        sentinel.setCustomTargetValueHigh(0L);
        result.add(sentinel);
    }

    /** Builds a single non-repeat {@link WorkoutStepMesg} from a step JSON node. */
    private WorkoutStepMesg buildLeafStep(JsonNode stepNode, ZoneContext ctx) {
        WorkoutStepMesg step = new WorkoutStepMesg();

        step.setIntensity(toIntensity(stepNode.get("type").asText()));
        applyDuration(step, stepNode.get("duration"));

        JsonNode target = stepNode.get("target");
        if (target != null && !target.isNull()) {
            applyTarget(step, target, ctx);
        } else {
            step.setTargetType(WktStepTarget.OPEN);
            step.setTargetValue(0L);
            step.setCustomTargetValueLow(0L);
            step.setCustomTargetValueHigh(0L);
        }

        // Step notes → wkt_step_name (max 16 chars per FIT spec)
        JsonNode notes = stepNode.get("notes");
        if (notes != null && !notes.isNull()) {
            step.setWktStepName(truncate(notes.asText(), 16));
        }

        return step;
    }

    // ── Duration mapping ──────────────────────────────────────────────────────

    private static void applyDuration(WorkoutStepMesg step, JsonNode duration) {
        if (duration == null || duration.isNull()) {
            step.setDurationType(WktStepDuration.OPEN);
            step.setDurationValue(0L);
            return;
        }

        String type      = duration.get("type").asText();
        JsonNode valNode = duration.get("value");

        switch (type) {
            case "time" -> {
                // Internal: seconds → FIT: milliseconds
                step.setDurationType(WktStepDuration.TIME);
                step.setDurationValue(valNode.asLong() * 1000L);
            }
            case "distance" -> {
                // Internal: meters → FIT: centimeters
                step.setDurationType(WktStepDuration.DISTANCE);
                step.setDurationValue(valNode.asLong() * 100L);
            }
            case "calories" -> {
                step.setDurationType(WktStepDuration.CALORIES);
                step.setDurationValue(valNode.asLong());
            }
            case "lap_button" -> {
                step.setDurationType(WktStepDuration.OPEN);
                step.setDurationValue(0L);
            }
            case "hr_above" -> {
                step.setDurationType(WktStepDuration.HR_GREATER_THAN);
                step.setDurationValue(valNode.asLong());
            }
            case "hr_below" -> {
                step.setDurationType(WktStepDuration.HR_LESS_THAN);
                step.setDurationValue(valNode.asLong());
            }
            default -> {
                step.setDurationType(WktStepDuration.OPEN);
                step.setDurationValue(0L);
            }
        }
    }

    // ── Target mapping ────────────────────────────────────────────────────────

    /**
     * Maps an internal target descriptor to FIT step target fields.
     *
     * <p>Zone targets use SDK convenience setters (e.g., {@code setTargetPowerZone}) which
     * internally set both {@code targetType} and {@code targetValue}.
     * Custom ranges use {@code customTargetValueLow}/{@code High}.
     */
    private static void applyTarget(WorkoutStepMesg step, JsonNode target, ZoneContext ctx) {
        String type = target.get("type").asText();

        switch (type) {
            case "power_zone" -> {
                // SDK sets targetType=POWER + encodes zone number in targetValue
                step.setTargetPowerZone((long) target.get("zone").asInt());
                step.setCustomTargetValueLow(0L);
                step.setCustomTargetValueHigh(0L);
            }
            case "power_watts" -> {
                step.setTargetType(WktStepTarget.POWER);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(target.get("min").asLong());
                step.setCustomTargetValueHigh(target.get("max").asLong());
            }
            case "power_pct" -> {
                // Convert % of FTP to absolute watts
                long minW = Math.round(ctx.ftpWatts() * target.get("min").asDouble());
                long maxW = Math.round(ctx.ftpWatts() * target.get("max").asDouble());
                step.setTargetType(WktStepTarget.POWER);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(minW);
                step.setCustomTargetValueHigh(maxW);
            }
            case "hr_zone" -> {
                // SDK sets targetType=HEART_RATE + encodes zone number
                step.setTargetHrZone((long) target.get("zone").asInt());
                step.setCustomTargetValueLow(0L);
                step.setCustomTargetValueHigh(0L);
            }
            case "hr_bpm" -> {
                step.setTargetType(WktStepTarget.HEART_RATE);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(target.get("min").asLong());
                step.setCustomTargetValueHigh(target.get("max").asLong());
            }
            case "hr_pct" -> {
                // Convert % of LTHR to absolute bpm
                long minBpm = Math.round(ctx.lthrBpm() * target.get("min").asDouble());
                long maxBpm = Math.round(ctx.lthrBpm() * target.get("max").asDouble());
                step.setTargetType(WktStepTarget.HEART_RATE);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(minBpm);
                step.setCustomTargetValueHigh(maxBpm);
            }
            case "pace_zone" -> {
                // SDK sets targetType=SPEED + encodes zone number
                step.setTargetSpeedZone((long) target.get("zone").asInt());
                step.setCustomTargetValueLow(0L);
                step.setCustomTargetValueHigh(0L);
            }
            case "pace" -> {
                // Internal: sec/km (min=faster, max=slower) → FIT speed in mm/s (inverted)
                long speedHigh = paceSecPerKmToMmPerSec(target.get("min").asDouble());
                long speedLow  = paceSecPerKmToMmPerSec(target.get("max").asDouble());
                step.setTargetType(WktStepTarget.SPEED);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(speedLow);
                step.setCustomTargetValueHigh(speedHigh);
            }
            case "speed" -> {
                // Internal: km/h → FIT: mm/s
                long minMms = kphToMmPerSec(target.get("min").asDouble());
                long maxMms = kphToMmPerSec(target.get("max").asDouble());
                step.setTargetType(WktStepTarget.SPEED);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(minMms);
                step.setCustomTargetValueHigh(maxMms);
            }
            default -> {
                // rpe, open, unknown
                step.setTargetType(WktStepTarget.OPEN);
                step.setTargetValue(0L);
                step.setCustomTargetValueLow(0L);
                step.setCustomTargetValueHigh(0L);
            }
        }
    }

    // ── Unit conversions ──────────────────────────────────────────────────────

    /** Pace in sec/km → speed in mm/s. */
    private static long paceSecPerKmToMmPerSec(double secPerKm) {
        if (secPerKm <= 0) return 0L;
        return Math.round(1_000_000.0 / secPerKm);
    }

    /** km/h → mm/s. */
    private static long kphToMmPerSec(double kph) {
        return Math.round(kph * 1_000.0 / 3.6);
    }

    // ── FIT type mappings ─────────────────────────────────────────────────────

    private static Intensity toIntensity(String stepType) {
        return switch (stepType) {
            case "warmup"       -> Intensity.WARMUP;
            case "cooldown"     -> Intensity.COOLDOWN;
            case "rest"         -> Intensity.REST;
            case "work", "ramp" -> Intensity.ACTIVE;
            default             -> Intensity.ACTIVE;
        };
    }

    private static Sport toFitSport(String sport) {
        if (sport == null) return Sport.GENERIC;
        return switch (sport.toLowerCase()) {
            case "cycling"  -> Sport.CYCLING;
            case "running"  -> Sport.RUNNING;
            case "swimming" -> Sport.SWIMMING;
            default         -> Sport.GENERIC;
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static JsonNode parseSteps(String stepsJson) {
        try {
            return MAPPER.readTree(stepsJson);
        } catch (Exception e) {
            throw new WorkoutValidationException("steps JSON is not parseable: " + e.getMessage());
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
