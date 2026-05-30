package com.coachfit.sync.application.service;

import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort;
import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort.DailySummaryData;
import com.coachfit.health.application.port.out.HealthEpochSummaryPersistencePort;
import com.coachfit.health.application.port.out.HealthSleepDataPersistencePort;
import com.coachfit.health.application.port.out.HealthSleepDataPersistencePort.SleepData;
import com.coachfit.sync.application.port.out.SyncLogPersistencePort;
import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort;
import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort.WellnessFields;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Worker service: processes Garmin health push jobs from the Redis Stream.
 *
 * <p><strong>Handled job types:</strong>
 * <ul>
 *   <li>{@code garmin_dailies}     → upsert {@code health_daily_summaries}, autofill wellness
 *   <li>{@code garmin_sleep}       → upsert {@code health_sleep_data}, autofill wellness
 *   <li>{@code garmin_body}        → upsert weight into {@code health_daily_summaries} + wellness
 *   <li>{@code garmin_stress}      → aggregate daily avg stress → {@code health_daily_summaries}
 *   <li>{@code garmin_hrv}         → upsert HRV → {@code health_sleep_data}, autofill wellness
 *   <li>{@code garmin_pulseox}     → aggregate avg SpO2 → {@code health_daily_summaries}
 *   <li>{@code garmin_respiration} → aggregate avg respiration → {@code health_daily_summaries}
 *   <li>{@code garmin_user_metrics}→ VO2max → {@code health_daily_summaries}
 * </ul>
 *
 * <p>Activities and activity-details are handled by {@link GarminActivitySyncService}.
 *
 * <p>Each {@code process*} method is transactional — the persistence write and
 * wellness autofill happen atomically within one transaction.
 *
 * <p>See docs/06-sync-engine-spec.md §Health Data Processing.
 */
@Service
public class GarminHealthProcessingService {

    private static final Logger log = LoggerFactory.getLogger(GarminHealthProcessingService.class);

    private static final String PROVIDER = "garmin";

    private final HealthDailySummaryPersistencePort dailySummaryPort;
    private final HealthSleepDataPersistencePort    sleepDataPort;
    private final HealthEpochSummaryPersistencePort epochSummaryPort;
    private final WellnessLogPersistencePort        wellnessPort;
    private final SyncLogPersistencePort            syncLogPort;
    private final ObjectMapper                      objectMapper;
    private final JdbcClient                        jdbcClient;

    public GarminHealthProcessingService(HealthDailySummaryPersistencePort dailySummaryPort,
                                         HealthSleepDataPersistencePort sleepDataPort,
                                         HealthEpochSummaryPersistencePort epochSummaryPort,
                                         WellnessLogPersistencePort wellnessPort,
                                         SyncLogPersistencePort syncLogPort,
                                         ObjectMapper objectMapper,
                                         JdbcClient jdbcClient) {
        this.dailySummaryPort = dailySummaryPort;
        this.sleepDataPort    = sleepDataPort;
        this.epochSummaryPort = epochSummaryPort;
        this.wellnessPort     = wellnessPort;
        this.syncLogPort      = syncLogPort;
        this.objectMapper     = objectMapper;
        this.jdbcClient       = jdbcClient;
    }

    // ── Daily summary (dailies push) ──────────────────────────────────────────

    /**
     * Processes a {@code garmin_dailies} job.
     *
     * <p>Garmin payload fields (partial — all fields optional):
     * <pre>
     * {
     *   "calendarDate":           "2025-03-15",
     *   "startTimeInSeconds":     1710460800,
     *   "steps":                  12500,
     *   "distanceInMeters":       9234.5,
     *   "activeKilocalories":     800,
     *   "bmrKilocalories":        1800,
     *   "restingHeartRateInBeatsPerMinute": 52,
     *   "averageStressLevel":     28,
     *   "maxStressLevel":         65,
     *   "bodyBatteryChargedValue": 45,
     *   "bodyBatteryDrainedValue": 32,
     *   "highlyActiveSeconds":    1800,
     *   "activeSeconds":          3600,
     *   "floorsClimbed":          12,
     *   "averageSpO2":            96.5,
     *   "averageRespirationValue": 14.2
     * }
     * </pre>
     *
     * <p>Autofill path: resting_hr and stress_level are written to {@code wellness_logs}
     * for the same date (docs/06-sync-engine-spec.md §Dailies push).
     *
     * @param userId  CoachFit user UUID
     * @param logId   sync_log entry ID to complete on success/failure
     * @param payload serialised JSON of single Garmin daily element
     */
    @Transactional
    public void processDailies(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            LocalDate date = extractDate(d);
            String rawJson = payload;

            Integer steps           = getInt(d, "steps");
            Double distMeters       = getDouble(d, "distanceInMeters");
            Integer activeKcal      = getInt(d, "activeKilocalories");
            Integer bmrKcal         = getInt(d, "bmrKilocalories");
            Integer totalKcal       = (activeKcal != null && bmrKcal != null) ? activeKcal + bmrKcal
                                     : (activeKcal != null ? activeKcal : bmrKcal);
            Integer restingHr       = getInt(d, "restingHeartRateInBeatsPerMinute");
            Integer avgStress       = getInt(d, "averageStressLevel");
            Integer maxStress       = getInt(d, "maxStressLevel");
            Integer bbHigh          = getInt(d, "bodyBatteryChargedValue");
            Integer bbLow           = getInt(d, "bodyBatteryDrainedValue");
            Integer intensityMins   = toMinutes(getInt(d, "highlyActiveSeconds"));
            Integer activeMins      = toMinutes(getInt(d, "activeSeconds"));
            Integer floors          = getInt(d, "floorsClimbed");
            BigDecimal avgSpo2      = getBigDecimal(d, "averageSpO2");
            BigDecimal avgResp      = getBigDecimal(d, "averageRespirationValue");

            // Build extra JSONB with Garmin-specific fields not in common columns
            String extraJson = buildExtra(d,
                    "userAccessToken", "calendarDate", "startTimeInSeconds",
                    "steps", "distanceInMeters", "activeKilocalories", "bmrKilocalories",
                    "restingHeartRateInBeatsPerMinute", "averageStressLevel", "maxStressLevel",
                    "bodyBatteryChargedValue", "bodyBatteryDrainedValue",
                    "highlyActiveSeconds", "activeSeconds", "floorsClimbed",
                    "averageSpO2", "averageRespirationValue");

            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    steps,
                    distMeters != null ? BigDecimal.valueOf(distMeters).setScale(2, RoundingMode.HALF_UP) : null,
                    totalKcal,
                    activeKcal,
                    activeMins,
                    intensityMins,
                    floors,
                    restingHr,
                    null,   // avg_hr not in dailies push
                    null,   // max_hr not in dailies push
                    avgStress,
                    maxStress,
                    bbHigh,
                    bbLow,
                    avgSpo2,
                    avgResp,
                    null,   // vo2max comes from user-metrics push
                    extraJson,
                    rawJson
            ));

            // ── Wellness autofill: resting_hr + stress_level ──────────────────
            if (restingHr != null || avgStress != null) {
                Short stressLevel = avgStress != null
                        ? normalizeStress1to5(avgStress) : null;
                wellnessPort.upsert(userId, date, PROVIDER, new WellnessFields(
                        null, null, null, null, null, null,
                        stressLevel,
                        restingHr,
                        null, null, null,
                        buildFieldSources(
                                restingHr != null ? "resting_hr" : null,
                                avgStress != null ? "stress_level" : null)
                ));
            }

            syncLogPort.complete(logId, "success", null, null);
            log.info("Garmin dailies processed: userId={} date={}", userId, date);

        } catch (Exception e) {
            log.error("Garmin dailies failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Sleep ─────────────────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_sleep} job.
     *
     * <p>Garmin payload fields (partial):
     * <pre>
     * {
     *   "calendarDate":            "2025-03-15",
     *   "startTimeInSeconds":      1710432000,
     *   "durationInSeconds":       27000,
     *   "deepSleepDurationInSeconds": 5400,
     *   "lightSleepDurationInSeconds": 16200,
     *   "remSleepInSeconds":       3600,
     *   "awakeDurationInSeconds":  1800,
     *   "sleepScores":             {"overall": {"value": 82}},
     *   "averageRespirationValue": 14.1,
     *   "averageSpO2Value":        97.0,
     *   "averageHRV":              45.2,
     *   "hrvStatus":               "BALANCED"
     * }
     * </pre>
     *
     * <p>Autofill path: sleep_hours, sleep_quality, hrv written to {@code wellness_logs}
     * (docs/06-sync-engine-spec.md §Sleep push).
     */
    @Transactional
    public void processSleep(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            LocalDate date         = extractDate(d);

            Long startSec   = getLong(d, "startTimeInSeconds");
            Integer duration = getInt(d, "durationInSeconds");
            Instant sleepStart = startSec != null ? Instant.ofEpochSecond(startSec) : null;
            Instant sleepEnd   = (sleepStart != null && duration != null)
                    ? sleepStart.plusSeconds(duration) : null;

            Integer deepSec   = getInt(d, "deepSleepDurationInSeconds");
            Integer lightSec  = getInt(d, "lightSleepDurationInSeconds");
            Integer remSec    = getInt(d, "remSleepInSeconds");
            Integer awakeSec  = getInt(d, "awakeDurationInSeconds");
            Integer score     = extractSleepScore(d);
            BigDecimal avgResp = getBigDecimal(d, "averageRespirationValue");
            BigDecimal avgSpo2 = getBigDecimal(d, "averageSpO2Value");
            BigDecimal avgHrv  = getBigDecimal(d, "averageHRV");
            String hrvStatus   = normalizeHrvStatus(getString(d, "hrvStatus"));

            String extraJson = buildExtra(d,
                    "userAccessToken", "calendarDate", "startTimeInSeconds", "durationInSeconds",
                    "deepSleepDurationInSeconds", "lightSleepDurationInSeconds", "remSleepInSeconds",
                    "awakeDurationInSeconds", "sleepScores", "averageRespirationValue",
                    "averageSpO2Value", "averageHRV", "hrvStatus");

            sleepDataPort.upsert(userId, date, PROVIDER, new SleepData(
                    sleepStart, sleepEnd, duration,
                    deepSec, lightSec, remSec, awakeSec,
                    score, avgResp, avgSpo2, avgHrv, hrvStatus,
                    extraJson, payload
            ));

            // ── Wellness autofill: sleep_hours, sleep_quality, hrv ────────────
            BigDecimal sleepHours = duration != null
                    ? BigDecimal.valueOf(duration / 3600.0).setScale(1, RoundingMode.HALF_UP) : null;
            Short sleepQuality = score != null ? normalizeSleepScore1to5(score) : null;
            BigDecimal hrvVal  = avgHrv;

            if (sleepHours != null || sleepQuality != null || hrvVal != null) {
                wellnessPort.upsert(userId, date, PROVIDER, new WellnessFields(
                        null, null, sleepQuality, sleepHours,
                        null, null, null, null, hrvVal, null, null,
                        buildFieldSources(
                                sleepHours != null    ? "sleep_hours"    : null,
                                sleepQuality != null  ? "sleep_quality"  : null,
                                hrvVal != null        ? "hrv"            : null)
                ));
            }

            syncLogPort.complete(logId, "success", null, null);
            log.info("Garmin sleep processed: userId={} date={} score={}", userId, date, score);

        } catch (Exception e) {
            log.error("Garmin sleep failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Body composition ──────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_body} job.
     *
     * <p>Garmin payload fields (partial):
     * <pre>
     * {
     *   "measurementTimeInSeconds": 1710460800,
     *   "weightInGrams":           75000,
     *   "bodyFatPercentage":       18.5,
     *   "bodyMassIndex":           23.1
     * }
     * </pre>
     *
     * <p>Weight is written to {@code health_daily_summaries.extra} and
     * {@code wellness_logs.weight_kg}.
     */
    @Transactional
    public void processBodyComposition(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            Long measureTimeSec = getLong(d, "measurementTimeInSeconds");
            LocalDate date = measureTimeSec != null
                    ? Instant.ofEpochSecond(measureTimeSec).atZone(ZoneOffset.UTC).toLocalDate()
                    : LocalDate.now(ZoneOffset.UTC);

            Integer weightGrams = getInt(d, "weightInGrams");
            BigDecimal weightKg = weightGrams != null
                    ? BigDecimal.valueOf(weightGrams / 1000.0).setScale(2, RoundingMode.HALF_UP) : null;

            Double bmiRaw      = getDouble(d, "bodyMassIndex");
            Double fatRaw      = getDouble(d, "bodyFatPercentage");
            Double muscleMassRaw = getDouble(d, "muscleMassInGrams");
            Double boneMassRaw   = getDouble(d, "boneMassInGrams");

            BigDecimal bmi        = bmiRaw       != null ? BigDecimal.valueOf(bmiRaw).setScale(1, RoundingMode.HALF_UP) : null;
            BigDecimal bodyFatPct = fatRaw        != null ? BigDecimal.valueOf(fatRaw).setScale(1, RoundingMode.HALF_UP) : null;
            BigDecimal muscleKg   = muscleMassRaw != null ? BigDecimal.valueOf(muscleMassRaw / 1000.0).setScale(2, RoundingMode.HALF_UP) : null;
            BigDecimal boneKg     = boneMassRaw   != null ? BigDecimal.valueOf(boneMassRaw / 1000.0).setScale(2, RoundingMode.HALF_UP) : null;

            // Extra: any remaining provider-specific fields
            String extraJson = buildExtra(d, "userAccessToken", "measurementTimeInSeconds",
                    "weightInGrams", "bodyMassIndex", "bodyFatPercentage",
                    "muscleMassInGrams", "boneMassInGrams");

            // Upsert daily summary — now uses dedicated body composition columns
            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null,
                    null, null, null,
                    weightKg, bodyFatPct, muscleKg, boneKg, bmi,
                    extraJson, payload
            ));

            // ── Wellness autofill: weight_kg ──────────────────────────────────
            if (weightKg != null) {
                wellnessPort.upsert(userId, date, PROVIDER, new WellnessFields(
                        null, null, null, null, null, null, null,
                        null, null, weightKg, null,
                        buildFieldSources("weight_kg")
                ));
            }

            syncLogPort.complete(logId, "success", null, null);
            log.info("Garmin body composition processed: userId={} date={} weightKg={} fat={}% bmi={}",
                    userId, date, weightKg, bodyFatPct, bmi);

        } catch (Exception e) {
            log.error("Garmin body composition failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }


    // ── Stress ────────────────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_stress} job.
     *
     * <p>Garmin stress payload contains per-sample stress readings throughout the day:
     * <pre>
     * {
     *   "startTimeInSeconds": 1710460800,
     *   "startTimeOffsetInSeconds": 25200,
     *   "stressLevel": 35,
     *   "bodyBattery": { "charged": 20, "drained": 15 }
     * }
     * </pre>
     *
     * <p>A stress detail push can be a single sample or represent a stress summary.
     * We upsert the {@code avg_stress} and optionally {@code body_battery} into
     * {@code health_daily_summaries} for the date derived from {@code startTimeInSeconds}.
     */
    @Transactional
    public void processStress(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            Long startSec = getLong(d, "startTimeInSeconds");
            LocalDate date = startSec != null
                    ? Instant.ofEpochSecond(startSec).atZone(ZoneOffset.UTC).toLocalDate()
                    : LocalDate.now(ZoneOffset.UTC);

            Integer stressLevel = getInt(d, "stressLevel");
            // Body battery from stress push (optional, Garmin may include it)
            Integer bbCharged = extractNestedInt(d, "bodyBattery", "charged");
            Integer bbDrained = extractNestedInt(d, "bodyBattery", "drained");

            String extraJson = buildExtra(d,
                    "userAccessToken", "startTimeInSeconds", "startTimeOffsetInSeconds",
                    "stressLevel", "bodyBattery");

            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    null, null, null, null, null, null, null,
                    null, null, null,
                    stressLevel, null,
                    bbCharged, bbDrained,
                    null, null, null,
                    extraJson, payload
            ));

            syncLogPort.complete(logId, "success", null, null);
            log.debug("Garmin stress processed: userId={} date={} stress={}", userId, date, stressLevel);

        } catch (Exception e) {
            log.error("Garmin stress failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── HRV ───────────────────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_hrv} job.
     *
     * <p>Garmin HRV payload shape:
     * <pre>
     * {
     *   "startTimeInSeconds": 1710432000,
     *   "hrvSummary": {
     *     "weeklyAvg":      45,
     *     "lastNight":      42,
     *     "lastNight5MinHigh": 55,
     *     "status":         "BALANCED"
     *   }
     * }
     * </pre>
     *
     * <p>Upserts {@code health_sleep_data.avg_hrv} and auto-updates
     * {@code wellness_logs.hrv} for the night date.
     */
    @Transactional
    public void processHrv(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            Long startSec = getLong(d, "startTimeInSeconds");
            // HRV is associated with the sleep night — use the wakeup date (next day)
            LocalDate date = startSec != null
                    ? Instant.ofEpochSecond(startSec).atZone(ZoneOffset.UTC).toLocalDate().plusDays(1)
                    : LocalDate.now(ZoneOffset.UTC);

            Map<String, Object> summary = getNestedMap(d, "hrvSummary");
            BigDecimal avgHrv   = summary != null ? getBigDecimal(summary, "lastNight") : null;
            String     status   = normalizeHrvStatus(
                    summary != null ? getString(summary, "status") : null);

            String extraJson = buildExtra(d, "userAccessToken", "startTimeInSeconds");

            // Update sleep data with HRV (merge-upsert only HRV fields)
            sleepDataPort.upsert(userId, date, PROVIDER, new SleepData(
                    null, null, null, null, null, null, null,
                    null, null, null, avgHrv, status,
                    extraJson, payload
            ));

            // ── Wellness autofill: hrv ────────────────────────────────────────
            if (avgHrv != null) {
                wellnessPort.upsert(userId, date, PROVIDER, new WellnessFields(
                        null, null, null, null, null, null, null,
                        null, avgHrv, null, null,
                        buildFieldSources("hrv")
                ));
            }

            syncLogPort.complete(logId, "success", null, null);
            log.info("Garmin HRV processed: userId={} date={} hrv={}", userId, date, avgHrv);

        } catch (Exception e) {
            log.error("Garmin HRV failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Pulse Ox (SpO2) ───────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_pulseox} job.
     *
     * <p>Garmin Pulse Ox payload shape:
     * <pre>
     * {
     *   "startTimeInSeconds": 1710460800,
     *   "spo2Value":          96.5,
     *   "onDemand":           false
     * }
     * </pre>
     *
     * <p>Upserts average SpO2 into {@code health_daily_summaries.avg_spo2}.
     */
    @Transactional
    public void processPulseOx(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            Long startSec = getLong(d, "startTimeInSeconds");
            LocalDate date = startSec != null
                    ? Instant.ofEpochSecond(startSec).atZone(ZoneOffset.UTC).toLocalDate()
                    : LocalDate.now(ZoneOffset.UTC);

            BigDecimal spo2 = getBigDecimal(d, "spo2Value");
            String extraJson = buildExtra(d,
                    "userAccessToken", "startTimeInSeconds", "spo2Value", "onDemand");

            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null,
                    spo2, null, null,
                    extraJson, payload
            ));

            syncLogPort.complete(logId, "success", null, null);
            log.debug("Garmin PulseOx processed: userId={} date={} spo2={}", userId, date, spo2);

        } catch (Exception e) {
            log.error("Garmin PulseOx failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Respiration ───────────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_respiration} job.
     *
     * <p>Garmin respiration payload shape (epoch summary):
     * <pre>
     * {
     *   "startTimeInSeconds":       1710460800,
     *   "respirationEpochSummary": [
     *     { "startTimeInSeconds": ..., "respirationValue": 13.5 }, ...
     *   ]
     * }
     * </pre>
     *
     * <p>Computes average respiration and upserts into
     * {@code health_daily_summaries.avg_respiration}.
     */
    @Transactional
    public void processRespiration(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            Long startSec = getLong(d, "startTimeInSeconds");
            LocalDate date = startSec != null
                    ? Instant.ofEpochSecond(startSec).atZone(ZoneOffset.UTC).toLocalDate()
                    : LocalDate.now(ZoneOffset.UTC);

            // Compute average from epoch summaries array if present
            BigDecimal avgResp = computeAvgRespiration(d);

            String extraJson = buildExtra(d,
                    "userAccessToken", "startTimeInSeconds", "respirationEpochSummary");

            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null,
                    null, avgResp, null,
                    extraJson, payload
            ));

            syncLogPort.complete(logId, "success", null, null);
            log.debug("Garmin respiration processed: userId={} date={} avgResp={}", userId, date, avgResp);

        } catch (Exception e) {
            log.error("Garmin respiration failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── User Metrics (VO2max) ─────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_user_metrics} job.
     *
     * <p>Garmin user metrics payload shape:
     * <pre>
     * {
     *   "calendarDate":  "2025-03-15",
     *   "vo2Max":        48.0,
     *   "fitnessAge":    32,
     *   "trainingStatus": "MAINTAINING"
     * }
     * </pre>
     *
     * <p>Upserts VO2max into {@code health_daily_summaries.vo2max}. Training status
     * and fitness age go into {@code extra}.
     */
    @Transactional
    public void processUserMetrics(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            LocalDate date = extractDate(d);

            BigDecimal vo2max = getBigDecimal(d, "vo2Max");
            String extraJson = buildExtra(d,
                    "userAccessToken", "calendarDate", "vo2Max");

            dailySummaryPort.upsert(userId, date, PROVIDER, new DailySummaryData(
                    null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null,
                    null, null, vo2max,
                    extraJson, payload
            ));

            syncLogPort.complete(logId, "success", null, null);
            log.info("Garmin user-metrics processed: userId={} date={} vo2max={}", userId, date, vo2max);

        } catch (Exception e) {
            log.error("Garmin user-metrics failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Payload extraction helpers ────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse Garmin payload: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the date from a Garmin payload.
     * Prefers {@code calendarDate} (ISO date string); falls back to
     * {@code startTimeInSeconds} epoch → UTC date.
     */
    private LocalDate extractDate(Map<String, Object> d) {
        String cal = getString(d, "calendarDate");
        if (cal != null && !cal.isBlank()) {
            return LocalDate.parse(cal);
        }
        Long sec = getLong(d, "startTimeInSeconds");
        if (sec != null) {
            return Instant.ofEpochSecond(sec).atZone(ZoneOffset.UTC).toLocalDate();
        }
        return LocalDate.now(ZoneOffset.UTC);
    }

    private Integer getInt(Map<String, Object> d, String key) {
        Object v = d.get(key);
        if (v instanceof Number n) return n.intValue();
        return null;
    }

    private Long getLong(Map<String, Object> d, String key) {
        Object v = d.get(key);
        if (v instanceof Number n) return n.longValue();
        return null;
    }

    private Double getDouble(Map<String, Object> d, String key) {
        Object v = d.get(key);
        if (v instanceof Number n) return n.doubleValue();
        return null;
    }

    private BigDecimal getBigDecimal(Map<String, Object> d, String key) {
        Object v = d.get(key);
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue()).setScale(1, RoundingMode.HALF_UP);
        return null;
    }

    private String getString(Map<String, Object> d, String key) {
        Object v = d.get(key);
        return v instanceof String s ? s : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getNestedMap(Map<String, Object> d, String key) {
        Object v = d.get(key);
        return v instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
    }

    private Integer extractNestedInt(Map<String, Object> d, String outerKey, String innerKey) {
        Map<String, Object> inner = getNestedMap(d, outerKey);
        return inner != null ? getInt(inner, innerKey) : null;
    }

    /**
     * Extracts the sleep score integer from the nested {@code sleepScores.overall.value} path.
     * Returns null if the structure is absent.
     */
    @SuppressWarnings("unchecked")
    private Integer extractSleepScore(Map<String, Object> d) {
        Object scores = d.get("sleepScores");
        if (!(scores instanceof Map<?, ?> scoresMap)) return null;
        Object overall = ((Map<String, Object>) scoresMap).get("overall");
        if (!(overall instanceof Map<?, ?> overallMap)) return null;
        return getInt((Map<String, Object>) overallMap, "value");
    }

    /**
     * Computes average respiration from an epoch summary array.
     * Returns null if no readings are present.
     */
    @SuppressWarnings("unchecked")
    private BigDecimal computeAvgRespiration(Map<String, Object> d) {
        Object epochs = d.get("respirationEpochSummary");
        if (!(epochs instanceof List<?> list) || list.isEmpty()) return null;

        double sum = 0;
        int count = 0;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> m)) continue;
            Object val = ((Map<String, Object>) m).get("respirationValue");
            if (val instanceof Number n) {
                sum += n.doubleValue();
                count++;
            }
        }
        if (count == 0) return null;
        return BigDecimal.valueOf(sum / count).setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Builds a JSON string of extra provider-specific fields — all fields
     * in the data map that are NOT in the excluded standard-column set.
     */
    private String buildExtra(Map<String, Object> d, String... excludedKeys) {
        Map<String, Object> extra = new java.util.LinkedHashMap<>(d);
        for (String k : excludedKeys) extra.remove(k);
        try {
            return objectMapper.writeValueAsString(extra);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    /** Builds body composition extra JSON. */
    private String buildBodyExtra(BigDecimal weightKg, Double bmi, Double fat,
                                  Map<String, Object> d) {
        Map<String, Object> extra = new java.util.LinkedHashMap<>();
        if (weightKg != null) extra.put("weight_kg", weightKg);
        if (bmi      != null) extra.put("bmi", bmi);
        if (fat      != null) extra.put("body_fat_pct", fat);
        // Include any remaining Garmin-specific fields
        d.forEach((k, v) -> {
            if (!extra.containsKey(k)
                    && !k.equals("userAccessToken")
                    && !k.equals("measurementTimeInSeconds")
                    && !k.equals("weightInGrams")
                    && !k.equals("bodyMassIndex")
                    && !k.equals("bodyFatPercentage")) {
                extra.put(k, v);
            }
        });
        try {
            return objectMapper.writeValueAsString(extra);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    // ── Normalisation helpers ─────────────────────────────────────────────────

    /**
     * Normalises Garmin average stress (0–100) to wellness scale (1–5).
     * <ul>
     *   <li>0–25 → 1 (low)</li>
     *   <li>26–50 → 2</li>
     *   <li>51–65 → 3</li>
     *   <li>66–80 → 4</li>
     *   <li>81–100 → 5 (high)</li>
     * </ul>
     */
    static Short normalizeStress1to5(int garminStress) {
        if (garminStress <= 25) return 1;
        if (garminStress <= 50) return 2;
        if (garminStress <= 65) return 3;
        if (garminStress <= 80) return 4;
        return 5;
    }

    /**
     * Normalises Garmin sleep score (0–100) to wellness scale (1–5).
     * <ul>
     *   <li>≥80 → 5 (excellent)</li>
     *   <li>65–79 → 4 (good)</li>
     *   <li>50–64 → 3 (fair)</li>
     *   <li>35–49 → 2 (poor)</li>
     *   <li>&lt;35 → 1 (very poor)</li>
     * </ul>
     */
    static Short normalizeSleepScore1to5(int score) {
        if (score >= 80) return 5;
        if (score >= 65) return 4;
        if (score >= 50) return 3;
        if (score >= 35) return 2;
        return 1;
    }

    /**
     * Normalises Garmin HRV status string to schema values.
     * Schema: balanced / low / unbalanced (docs/04-db-schema.md §health_sleep_data).
     */
    static String normalizeHrvStatus(String garminStatus) {
        if (garminStatus == null) return null;
        return switch (garminStatus.toUpperCase()) {
            case "BALANCED"   -> "balanced";
            case "LOW"        -> "low";
            case "UNBALANCED" -> "unbalanced";
            default           -> garminStatus.toLowerCase();
        };
    }

    /**
     * Builds the {@code field_sources} JSON for wellness_logs merge.
     * Only non-null field names are included.
     *
     * <p>Example output: {@code {"resting_hr":"garmin","stress_level":"garmin"}}
     */
    private String buildFieldSources(String... fieldNames) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (String name : fieldNames) {
            if (name == null) continue;
            if (!first) sb.append(",");
            sb.append("\"").append(name).append("\":\"garmin\"");
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }

    /** Converts a nullable seconds value to whole minutes (floor). Returns null if input is null. */
    private static Integer toMinutes(Integer seconds) {
        return seconds != null ? seconds / 60 : null;
    }

    // ── Epoch (intraday 15-min) processing ────────────────────────────────────

    /**
     * Processes a {@code garmin_epochs} job.
     *
     * <p>Garmin epoch payload fields:
     * <ul>
     *   <li>{@code startTimeInSeconds} — epoch start (UTC unix seconds)</li>
     *   <li>{@code durationInSeconds}  — typically 900</li>
     *   <li>{@code steps}              — step count in this epoch</li>
     *   <li>{@code activeKilocalories} — kcal burned</li>
     *   <li>{@code met}                — metabolic equivalent</li>
     *   <li>{@code intensity}          — SEDENTARY / ACTIVE / HIGHLY_ACTIVE / etc.</li>
     *   <li>{@code movingDurationInSeconds} — seconds actively moving</li>
     *   <li>{@code distance}           — meters</li>
     * </ul>
     */
    @Transactional
    public void processEpochs(UUID userId, UUID logId, String payloadJson) {
        Map<String, Object> data = parsePayload(payloadJson);
        if (data == null) { syncLogPort.complete(logId, "skipped", null, "null payload"); return; }

        try {
            long epochStartSecs = getLong(data, "startTimeInSeconds");
            Instant epochStart  = Instant.ofEpochSecond(epochStartSecs);
            LocalDate date      = epochStart.atOffset(ZoneOffset.UTC).toLocalDate();

            // Normalise Garmin intensity string to lowercase
            String garminIntensity = getString(data, "intensity");
            String intensity = garminIntensity != null ? garminIntensity.toLowerCase() : null;

            // Collect extra fields not in common columns
            Map<String, Object> extra = new java.util.LinkedHashMap<>();
            Object speedMetersPerSec = data.get("speedMetersPerSecond");
            if (speedMetersPerSec != null) extra.put("speed_m_s", speedMetersPerSec);
            Object strenuousActivityMinutes = data.get("strenuousActivityMinutes");
            if (strenuousActivityMinutes != null) extra.put("strenuous_activity_min", strenuousActivityMinutes);

            var epochData = new com.coachfit.health.application.port.out.HealthEpochSummaryPersistencePort.EpochData(
                    getInteger(data, "durationInSeconds"),
                    getInteger(data, "steps"),
                    getInteger(data, "activeKilocalories"),
                    getBigDecimal(data, "met"),
                    intensity,
                    getInteger(data, "movingDurationInSeconds"),
                    getBigDecimal(data, "distance"),
                    extra.isEmpty() ? null : toJson(extra),
                    payloadJson
            );

            epochSummaryPort.upsert(userId, date, epochStart, PROVIDER, epochData);
            syncLogPort.complete(logId, "completed", null, null);
            log.debug("Garmin epoch upserted: userId={} epochStart={}", userId, epochStart);
        } catch (Exception e) {
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw new RuntimeException("processEpochs failed: " + e.getMessage(), e);
        }
    }

    // ── Blood Pressure processing ─────────────────────────────────────────────

    /**
     * Processes a {@code garmin_blood_pressure} job.
     *
     * <p>Stores readings in {@code health_daily_summaries.extra} under key
     * {@code blood_pressure_readings}. Only devices with BP sensors push this type.
     *
     * <p>Garmin payload fields:
     * <ul>
     *   <li>{@code startTimeInSeconds} — reading timestamp</li>
     *   <li>{@code systolic}           — systolic mmHg</li>
     *   <li>{@code diastolic}          — diastolic mmHg</li>
     *   <li>{@code pulse}              — pulse bpm at time of reading</li>
     * </ul>
     */
    @Transactional
    public void processBloodPressure(UUID userId, UUID logId, String payloadJson) {
        Map<String, Object> data = parsePayload(payloadJson);
        if (data == null) { syncLogPort.complete(logId, "skipped", null, "null payload"); return; }

        try {
            long startSecs = getLong(data, "startTimeInSeconds");
            LocalDate date = Instant.ofEpochSecond(startSecs).atOffset(ZoneOffset.UTC).toLocalDate();

            // Build a structured reading for storage in extra JSONB
            Map<String, Object> reading = new java.util.LinkedHashMap<>();
            reading.put("timestamp_epoch", startSecs);
            reading.put("systolic",  getInteger(data, "systolic"));
            reading.put("diastolic", getInteger(data, "diastolic"));
            reading.put("pulse",     getInteger(data, "pulse"));
            reading.put("measurement_time_local", getString(data, "measurementTimeLocal"));

            // Merge into health_daily_summaries.extra using a JSON array
            // Strategy: append to existing array or create new one
            String extraJson = toJson(Map.of("blood_pressure_readings", List.of(reading)));

            // Upsert daily summary with partial extra — merge via jsonb concat in SQL
            jdbcClient.sql("""
                    INSERT INTO health_daily_summaries
                        (id, user_id, date, source, extra, raw_payload, created_at)
                    VALUES
                        (gen_random_uuid(), :userId, :date, 'garmin',
                         :extra::jsonb, :raw::jsonb, now())
                    ON CONFLICT (user_id, source, date) DO UPDATE SET
                        extra       = health_daily_summaries.extra || EXCLUDED.extra,
                        raw_payload = EXCLUDED.raw_payload
                    """)
                    .param("userId", userId)
                    .param("date",   date)
                    .param("extra",  extraJson)
                    .param("raw",    payloadJson)
                    .update();

            syncLogPort.complete(logId, "completed", null, null);
            log.debug("Garmin blood pressure stored: userId={} date={}", userId, date);
        } catch (Exception e) {
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw new RuntimeException("processBloodPressure failed: " + e.getMessage(), e);
        }
    }

    // ── Women's Health processing ──────────────────────────────────────────────

    /**
     * Processes a {@code garmin_menstrual_cycle} job.
     *
     * <p>Stores cycle phase data in {@code health_daily_summaries.extra} under key
     * {@code menstrual_cycle}. Used for cycle-aware training plan adjustments.
     *
     * <p>Garmin payload fields:
     * <ul>
     *   <li>{@code calendarDate}    — date string (YYYY-MM-DD)</li>
     *   <li>{@code cycleDay}        — day within current cycle</li>
     *   <li>{@code phase}           — current phase (MENSTRUAL/FOLLICULAR/OVULATORY/LUTEAL)</li>
     *   <li>{@code predictedPhase}  — predicted phase if actual unknown</li>
     * </ul>
     */
    @Transactional
    public void processMenstrualCycle(UUID userId, UUID logId, String payloadJson) {
        Map<String, Object> data = parsePayload(payloadJson);
        if (data == null) { syncLogPort.complete(logId, "skipped", null, "null payload"); return; }

        try {
            String calendarDateStr = getString(data, "calendarDate");
            LocalDate date = calendarDateStr != null
                    ? LocalDate.parse(calendarDateStr)
                    : LocalDate.now(ZoneOffset.UTC);

            Map<String, Object> cycleData = new java.util.LinkedHashMap<>();
            cycleData.put("cycle_day",       getInteger(data, "cycleDay"));
            cycleData.put("phase",           normalizeToLower(getString(data, "phase")));
            cycleData.put("predicted_phase", normalizeToLower(getString(data, "predictedPhase")));

            String extraJson = toJson(Map.of("menstrual_cycle", cycleData));

            jdbcClient.sql("""
                    INSERT INTO health_daily_summaries
                        (id, user_id, date, source, extra, raw_payload, created_at)
                    VALUES
                        (gen_random_uuid(), :userId, :date, 'garmin',
                         :extra::jsonb, :raw::jsonb, now())
                    ON CONFLICT (user_id, source, date) DO UPDATE SET
                        extra       = health_daily_summaries.extra || EXCLUDED.extra,
                        raw_payload = EXCLUDED.raw_payload
                    """)
                    .param("userId", userId)
                    .param("date",   date)
                    .param("extra",  extraJson)
                    .param("raw",    payloadJson)
                    .update();

            syncLogPort.complete(logId, "completed", null, null);
            log.debug("Garmin menstrual cycle stored: userId={} date={}", userId, date);
        } catch (Exception e) {
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw new RuntimeException("processMenstrualCycle failed: " + e.getMessage(), e);
        }
    }

    /**
     * Processes a {@code garmin_pregnancy} job.
     *
     * <p>Stores pregnancy data in {@code health_daily_summaries.extra} under key
     * {@code pregnancy}.
     *
     * <p>Garmin payload fields:
     * <ul>
     *   <li>{@code weeksPregnant} — weeks of gestation</li>
     *   <li>{@code dueDate}       — expected due date (YYYY-MM-DD)</li>
     * </ul>
     */
    @Transactional
    public void processPregnancy(UUID userId, UUID logId, String payloadJson) {
        Map<String, Object> data = parsePayload(payloadJson);
        if (data == null) { syncLogPort.complete(logId, "skipped", null, "null payload"); return; }

        try {
            LocalDate date = LocalDate.now(ZoneOffset.UTC);

            Map<String, Object> pregnancyData = new java.util.LinkedHashMap<>();
            pregnancyData.put("weeks_pregnant", getInteger(data, "weeksPregnant"));
            pregnancyData.put("due_date",       getString(data, "dueDate"));

            String extraJson = toJson(Map.of("pregnancy", pregnancyData));

            jdbcClient.sql("""
                    INSERT INTO health_daily_summaries
                        (id, user_id, date, source, extra, raw_payload, created_at)
                    VALUES
                        (gen_random_uuid(), :userId, :date, 'garmin',
                         :extra::jsonb, :raw::jsonb, now())
                    ON CONFLICT (user_id, source, date) DO UPDATE SET
                        extra       = health_daily_summaries.extra || EXCLUDED.extra,
                        raw_payload = EXCLUDED.raw_payload
                    """)
                    .param("userId", userId)
                    .param("date",   date)
                    .param("extra",  extraJson)
                    .param("raw",    payloadJson)
                    .update();

            syncLogPort.complete(logId, "completed", null, null);
            log.debug("Garmin pregnancy data stored: userId={}", userId);
        } catch (Exception e) {
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw new RuntimeException("processPregnancy failed: " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String normalizeToLower(String value) {
        return value != null ? value.toLowerCase() : null;
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { return "{}"; }
    }
}

