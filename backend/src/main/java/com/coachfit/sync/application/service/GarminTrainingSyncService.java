package com.coachfit.sync.application.service;

import com.coachfit.sync.application.port.in.SyncWorkoutToGarminUseCase;
import com.coachfit.sync.application.port.out.GarminTrainingPort;
import com.coachfit.workout.application.port.in.GetWorkoutUseCase;
import com.coachfit.workout.application.port.in.GetWorkoutUseCase.WorkoutDetail;
import com.coachfit.workout.domain.FitEncoder;
import com.coachfit.workout.domain.ZoneContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service implementing {@link SyncWorkoutToGarminUseCase}.
 *
 * <h3>Sync flow</h3>
 * <ol>
 *   <li>Load calendar event details (workout_id, planned_date, existing garmin IDs)</li>
 *   <li>Load the workout definition and athlete zone context (FTP, LTHR)</li>
 *   <li>Build Garmin Training API JSON payload from the workout steps</li>
 *   <li>Call {@link GarminTrainingPort#upsertWorkout} — create or update the workout definition</li>
 *   <li>Call {@link GarminTrainingPort#scheduleWorkout} — assign to the calendar date</li>
 *   <li>Persist garmin_workout_id + garmin_scheduled_id back to {@code calendar_events}</li>
 * </ol>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Training API Integration.
 */
@Service
public class GarminTrainingSyncService implements SyncWorkoutToGarminUseCase {

    private static final Logger log = LoggerFactory.getLogger(GarminTrainingSyncService.class);

    private final GarminTrainingPort garminTrainingPort;
    private final GetWorkoutUseCase  getWorkoutUseCase;
    private final JdbcClient         jdbcClient;
    private final ObjectMapper       objectMapper;

    public GarminTrainingSyncService(GarminTrainingPort garminTrainingPort,
                                     GetWorkoutUseCase getWorkoutUseCase,
                                     JdbcClient jdbcClient,
                                     ObjectMapper objectMapper) {
        this.garminTrainingPort = garminTrainingPort;
        this.getWorkoutUseCase  = getWorkoutUseCase;
        this.jdbcClient         = jdbcClient;
        this.objectMapper       = objectMapper;
    }

    // ── SyncWorkoutToGarminUseCase ────────────────────────────────────────────

    @Override
    @Transactional
    public SyncResult syncToGarmin(UUID calendarEventId, UUID userId) {
        // 1. Load calendar event
        CalendarEventGarminView event = loadCalendarEvent(calendarEventId, userId);
        if (event.workoutId() == null) {
            throw new GarminSyncException("Calendar event " + calendarEventId + " has no attached workout.");
        }

        // 2. Load workout + zone context
        WorkoutDetail workout   = getWorkoutUseCase.get(userId, event.workoutId());
        ZoneContext   zoneCtx   = loadZoneContext(userId);

        // 3. Build Garmin Training API payload (JSON format, not FIT binary for API)
        String garminPayload = buildGarminWorkoutPayload(workout, zoneCtx);

        // 4. Upsert workout definition on Garmin Connect
        String garminWorkoutId = garminTrainingPort.upsertWorkout(userId, garminPayload, event.garminWorkoutId());

        // 5. If re-syncing, delete old schedule first, then re-create
        if (event.garminScheduledId().isPresent()) {
            try {
                garminTrainingPort.deleteSchedule(userId, garminWorkoutId, event.garminScheduledId().get());
            } catch (GarminTrainingPort.GarminTrainingException ex) {
                log.warn("Could not delete old Garmin schedule (continuing with new one): {}", ex.getMessage());
            }
        }

        // 6. Schedule workout on user's Garmin calendar
        String garminScheduledId = garminTrainingPort.scheduleWorkout(userId, garminWorkoutId, event.plannedDate());

        // 7. Persist Garmin IDs back to calendar_events
        persistGarminIds(calendarEventId, garminWorkoutId, garminScheduledId);

        log.info("Synced calendar event {} to Garmin: workoutId={} scheduleId={}",
                calendarEventId, garminWorkoutId, garminScheduledId);

        return new SyncResult(garminWorkoutId, garminScheduledId, event.plannedDate());
    }

    @Override
    @Transactional
    public void removeFromGarmin(UUID calendarEventId, UUID userId) {
        CalendarEventGarminView event = loadCalendarEvent(calendarEventId, userId);

        if (event.garminWorkoutId().isEmpty()) {
            log.debug("Calendar event {} has no Garmin IDs — nothing to remove", calendarEventId);
            return;
        }

        // Delete schedule first, then the workout definition
        if (event.garminScheduledId().isPresent()) {
            garminTrainingPort.deleteSchedule(userId, event.garminWorkoutId().get(), event.garminScheduledId().get());
        }
        garminTrainingPort.deleteWorkout(userId, event.garminWorkoutId().get());

        // Clear Garmin IDs from calendar_events
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET garmin_workout_id   = NULL,
                       garmin_scheduled_id = NULL,
                       garmin_synced_at    = NULL,
                       updated_at          = now()
                 WHERE id      = :eventId
                   AND user_id = :userId
                """)
                .param("eventId", calendarEventId)
                .param("userId",  userId)
                .update();

        log.info("Removed Garmin sync for calendar event {}", calendarEventId);
    }

    // ── Garmin Training API payload builder ───────────────────────────────────

    /**
     * Converts a CoachFit {@link WorkoutDetail} into Garmin Training API JSON format.
     *
     * <p>Garmin Training API workout JSON structure:
     * <pre>{@code
     * {
     *   "workoutName": "Tempo Intervals",
     *   "sport":       "CYCLING",
     *   "workoutSegments": [{
     *     "segmentOrder":  1,
     *     "sportType":     { "sportTypeId": 2, "sportTypeKey": "cycling" },
     *     "workoutSteps":  [...]
     *   }]
     * }
     * }</pre>
     *
     * <p>Each workout step maps to a {@code workoutStep} with:
     * {@code stepOrder}, {@code stepType} (warmup/cooldown/interval/rest),
     * {@code endCondition} (time/distance/open), {@code targetType} and range.
     */
    @SuppressWarnings("unchecked")
    private String buildGarminWorkoutPayload(WorkoutDetail workout, ZoneContext zoneCtx) {
        try {
            List<Map<String, Object>> steps = objectMapper.readValue(
                    workout.stepsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));

            List<Map<String, Object>> garminSteps = new java.util.ArrayList<>();
            int order = 1;
            for (Map<String, Object> step : steps) {
                garminSteps.add(convertStep(step, order++, zoneCtx, workout.sport()));
            }

            Map<String, Object> sportType = new LinkedHashMap<>();
            sportType.put("sportTypeKey", toGarminSport(workout.sport()));

            Map<String, Object> segment = new LinkedHashMap<>();
            segment.put("segmentOrder", 1);
            segment.put("sportType",    sportType);
            segment.put("workoutSteps", garminSteps);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("workoutName",     truncate(workout.name(), 50));
            payload.put("description",     workout.description() != null ? truncate(workout.description(), 250) : null);
            payload.put("sport",           toGarminSport(workout.sport()).toUpperCase());
            payload.put("workoutSegments", List.of(segment));

            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new GarminSyncException("Failed to build Garmin workout payload: " + e.getMessage());
        }
    }

    /**
     * Converts a CoachFit workout step to Garmin Training API step format.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> convertStep(Map<String, Object> step, int order, ZoneContext zoneCtx, String sport) {
        Map<String, Object> garminStep = new LinkedHashMap<>();
        garminStep.put("stepOrder", order);
        garminStep.put("stepType",  toGarminStepType(getString(step, "type")));

        // Duration / end condition
        Object duration = step.get("duration");
        if (duration instanceof Map<?,?> dur) {
            garminStep.put("endCondition",      toGarminEndCondition(getString((Map<String,Object>)dur, "type")));
            garminStep.put("endConditionValue", ((Map<String,Object>)dur).get("value"));
        } else {
            garminStep.put("endCondition", "open");
        }

        // Target
        Object target = step.get("target");
        if (target instanceof Map<?,?> tgt) {
            applyGarminTarget(garminStep, (Map<String,Object>) tgt, zoneCtx, sport);
        }

        return garminStep;
    }

    private void applyGarminTarget(Map<String, Object> garminStep, Map<String, Object> target, ZoneContext zoneCtx, String sport) {
        String type = getString(target, "type");
        if (type == null) return;

        switch (type) {
            case "power_zone" -> {
                garminStep.put("targetType", "power.zone");
                garminStep.put("targetValue", target.get("zone"));
            }
            case "power_watts" -> {
                garminStep.put("targetType",       "power");
                garminStep.put("targetValueLow",   target.get("min"));
                garminStep.put("targetValueHigh",  target.get("max"));
            }
            case "power_pct" -> {
                double minPct = getDouble(target, "min");
                double maxPct = getDouble(target, "max");
                if (sport != null && (sport.equalsIgnoreCase("running") || sport.equalsIgnoreCase("swimming"))) {
                    double thresholdPace = zoneCtx.thresholdPace();
                    double thresholdSpeed = 1000.0 / (thresholdPace > 0 ? thresholdPace : 300.0);
                    garminStep.put("targetType",       "speed");
                    garminStep.put("targetValueLow",   thresholdSpeed * minPct);
                    garminStep.put("targetValueHigh",  thresholdSpeed * maxPct);
                } else {
                    garminStep.put("targetType",       "power");
                    garminStep.put("targetValueLow",   Math.round(zoneCtx.ftpWatts() * minPct));
                    garminStep.put("targetValueHigh",  Math.round(zoneCtx.ftpWatts() * maxPct));
                }
            }
            case "hr_zone" -> {
                garminStep.put("targetType", "heart.rate.zone");
                garminStep.put("targetValue", target.get("zone"));
            }
            case "hr_bpm" -> {
                garminStep.put("targetType",       "heart.rate");
                garminStep.put("targetValueLow",   target.get("min"));
                garminStep.put("targetValueHigh",  target.get("max"));
            }
            case "hr_pct" -> {
                double minPct = getDouble(target, "min");
                double maxPct = getDouble(target, "max");
                garminStep.put("targetType",       "heart.rate");
                garminStep.put("targetValueLow",   Math.round(zoneCtx.lthrBpm() * minPct));
                garminStep.put("targetValueHigh",  Math.round(zoneCtx.lthrBpm() * maxPct));
            }
            case "pace" -> {
                double minPace = getDouble(target, "min"); // fast (fewer seconds)
                double maxPace = getDouble(target, "max"); // slow (more seconds)
                garminStep.put("targetType",       "speed");
                garminStep.put("targetValueLow",   maxPace > 0 ? 1000.0 / maxPace : 0.0);
                garminStep.put("targetValueHigh",  minPace > 0 ? 1000.0 / minPace : 0.0);
            }
            default -> garminStep.put("targetType", "open");
        }
    }

    // ── DB helpers ────────────────────────────────────────────────────────────

    private CalendarEventGarminView loadCalendarEvent(UUID calendarEventId, UUID userId) {
        record Row(UUID workoutId, LocalDate plannedDate,
                   String garminWorkoutId, String garminScheduledId) {}

        var result = jdbcClient.sql("""
                SELECT workout_id, planned_date, garmin_workout_id, garmin_scheduled_id
                  FROM calendar_events
                 WHERE id      = :eventId
                   AND user_id = :userId
                """)
                .param("eventId", calendarEventId)
                .param("userId",  userId)
                .query((rs, n) -> new Row(
                        rs.getObject("workout_id", UUID.class),
                        rs.getObject("planned_date", LocalDate.class),
                        rs.getString("garmin_workout_id"),
                        rs.getString("garmin_scheduled_id")))
                .optional();

        if (result.isEmpty()) {
            throw new GarminSyncException("Calendar event " + calendarEventId + " not found for user " + userId);
        }

        Row row = result.get();
        return new CalendarEventGarminView(
                calendarEventId,
                row.workoutId(),
                row.plannedDate(),
                Optional.ofNullable(row.garminWorkoutId()),
                Optional.ofNullable(row.garminScheduledId())
        );
    }

    /**
     * Loads zone context (FTP, LTHR, Running Threshold Pace) from athlete_profiles and sport_zones.
     */
    private ZoneContext loadZoneContext(UUID userId) {
        record Profile(int ftp, int lthr) {}
        var profileOpt = jdbcClient.sql("""
                SELECT ftp_watts, lthr_bpm
                  FROM athlete_profiles
                 WHERE user_id = :userId
                 LIMIT 1
                """)
                .param("userId", userId)
                .query((rs, n) -> new Profile(
                        rs.getInt("ftp_watts"),
                        rs.getInt("lthr_bpm")))
                .optional();

        int ftp = profileOpt.map(p -> p.ftp).orElse(200);
        int lthr = profileOpt.map(p -> p.lthr).orElse(160);

        var paceOpt = jdbcClient.sql("""
                SELECT ftp
                  FROM sport_zones
                 WHERE user_id = :userId
                   AND sport = 'running'
                   AND zone_type = 'pace'
                 ORDER BY effective_date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .query((rs, n) -> rs.getInt("ftp"))
                .optional();
        int thresholdPace = paceOpt.orElse(300);

        return new ZoneContext(ftp, lthr, thresholdPace);
    }

    private void persistGarminIds(UUID calendarEventId, String garminWorkoutId, String garminScheduledId) {
        jdbcClient.sql("""
                UPDATE calendar_events
                   SET garmin_workout_id   = :workoutId,
                       garmin_scheduled_id = :scheduleId,
                       garmin_synced_at    = now(),
                       updated_at          = now()
                 WHERE id = :eventId
                """)
                .param("workoutId",  garminWorkoutId)
                .param("scheduleId", garminScheduledId)
                .param("eventId",    calendarEventId)
                .update();
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private static String toGarminSport(String sport) {
        if (sport == null) return "generic";
        return switch (sport.toLowerCase()) {
            case "cycling"  -> "cycling";
            case "running"  -> "running";
            case "swimming" -> "swimming";
            default         -> "generic";
        };
    }

    private static String toGarminStepType(String stepType) {
        if (stepType == null) return "interval";
        return switch (stepType) {
            case "warmup"   -> "warmup";
            case "cooldown" -> "cooldown";
            case "rest"     -> "rest";
            default         -> "interval";
        };
    }

    private static String toGarminEndCondition(String durationType) {
        if (durationType == null) return "open";
        return switch (durationType) {
            case "time"       -> "time";
            case "distance"   -> "distance";
            case "calories"   -> "calories";
            case "lap_button" -> "open";
            default           -> "open";
        };
    }

    private static String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }

    private static double getDouble(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return 0; }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
