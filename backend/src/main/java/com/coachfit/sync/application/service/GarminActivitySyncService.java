package com.coachfit.sync.application.service;

import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import com.coachfit.sync.application.port.out.SyncLogPersistencePort;
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
import java.util.Optional;
import java.util.UUID;

/**
 * Worker service: processes Garmin activity and activity-detail push jobs.
 *
 * <p><strong>Handled job types:</strong>
 * <ul>
 *   <li>{@code garmin_activity}         → normalize → dedup → store in {@code activities}
 *   <li>{@code garmin_activity_details} → store time-series in {@code activity_streams}
 * </ul>
 *
 * <p><strong>Cross-source dedup:</strong> Uses {@code UNIQUE(user_id, 'garmin', sourceId)}
 * (Layer 1) and fingerprint matching (Layer 2) per docs/06-sync-engine-spec.md
 * §Deduplication Strategy.
 *
 * <p><strong>Garmin activity payload shape (summary push):</strong>
 * <pre>
 * {
 *   "userAccessToken":    "...",
 *   "summaryId":          "abc123",
 *   "activityType":       "CYCLING",
 *   "activityName":       "Morning Ride",
 *   "startTimeInSeconds": 1710460800,
 *   "durationInSeconds":  3600,
 *   "distanceInMeters":   42500.0,
 *   "totalElevationGain": 320.0,
 *   "averageHeartRateInBeatsPerMinute": 145,
 *   "maxHeartRateInBeatsPerMinute":     172,
 *   "averagePowerInWatts":             210.0,
 *   "maxPowerInWatts":                 650,
 *   "averageCadenceInRoundsPerMinute": 88,
 *   "activeKilocalories":             850,
 *   "startingLatitudeInDegree":       10.7769,
 *   "startingLongitudeInDegree":      106.7009,
 *   "laps": [ { ... } ]
 * }
 * </pre>
 *
 * <p><strong>Garmin activity-details payload shape:</strong>
 * <pre>
 * {
 *   "userAccessToken": "...",
 *   "summaryId":       "abc123",
 *   "samples": [
 *     {
 *       "startTimeInSeconds": 1710460800,
 *       "heartRate":          145,
 *       "powerInWatts":       210,
 *       "cadenceInRPM":       88,
 *       "speedMetersPerSecond": 11.8,
 *       "latitudeInDegree":   10.7769,
 *       "longitudeInDegree":  106.7009,
 *       "totalDistanceInMeters": 0.0,
 *       "elevationInMeters":  50.5
 *     },
 *     ...
 *   ]
 * }
 * </pre>
 */
@Service
public class GarminActivitySyncService {

    private static final Logger log = LoggerFactory.getLogger(GarminActivitySyncService.class);

    private static final String PROVIDER = "garmin";

    private final ActivityPersistencePort       activityPort;
    private final ActivityStreamPersistencePort streamPort;
    private final ActivityLapPersistencePort    lapPort;
    private final SyncLogPersistencePort        syncLogPort;
    private final ObjectMapper                  objectMapper;
    private final JdbcClient                    jdbcClient;

    public GarminActivitySyncService(ActivityPersistencePort activityPort,
                                     ActivityStreamPersistencePort streamPort,
                                     ActivityLapPersistencePort lapPort,
                                     SyncLogPersistencePort syncLogPort,
                                     ObjectMapper objectMapper,
                                     JdbcClient jdbcClient) {
        this.activityPort = activityPort;
        this.streamPort   = streamPort;
        this.lapPort      = lapPort;
        this.syncLogPort  = syncLogPort;
        this.objectMapper = objectMapper;
        this.jdbcClient   = jdbcClient;
    }

    // ── Activity summary ──────────────────────────────────────────────────────

    /**
     * Processes a {@code garmin_activity} job.
     *
     * <p>Pipeline:
     * <ol>
     *   <li>Extract summaryId (Garmin's stable activity identifier)</li>
     *   <li>Layer-1 dedup: {@code UNIQUE(user_id, 'garmin', summaryId)}</li>
     *   <li>Layer-2 fingerprint dedup (cross-source with Strava)</li>
     *   <li>Normalize sport type to internal vocabulary</li>
     *   <li>Persist activity row</li>
     *   <li>Persist laps if present</li>
     * </ol>
     */
    @Transactional
    public void processActivity(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            String summaryId = getString(d, "summaryId");

            // ── Layer-1 dedup ─────────────────────────────────────────────────
            if (activityPort.existsByUserSourceAndSourceId(userId, PROVIDER, summaryId)) {
                log.info("Garmin activity duplicate (Layer-1): userId={} summaryId={}", userId, summaryId);
                syncLogPort.complete(logId, "skipped", null, "duplicate");
                return;
            }

            // ── Normalize fields ──────────────────────────────────────────────
            Long startSec = getLong(d, "startTimeInSeconds");
            Instant startedAt = startSec != null ? Instant.ofEpochSecond(startSec) : Instant.now();

            Integer durationSec = getInt(d, "durationInSeconds");
            if (durationSec == null) durationSec = 0;

            String garminType = getString(d, "activityType");
            String sport      = normalizeSport(garminType);
            String subSport   = normalizeSubSport(garminType);
            String name       = getString(d, "activityName");
            if (name == null || name.isBlank()) name = sport.substring(0, 1).toUpperCase()
                    + sport.substring(1) + " Activity";

            Double distM = getDouble(d, "distanceInMeters");
            Double elevM = getDouble(d, "totalElevationGain");
            BigDecimal distMeters = distM != null
                    ? BigDecimal.valueOf(distM).setScale(2, RoundingMode.HALF_UP) : null;
            BigDecimal elevMeters = elevM != null
                    ? BigDecimal.valueOf(elevM).setScale(2, RoundingMode.HALF_UP) : null;

            // ── Layer-2 fingerprint dedup (cross-source) ──────────────────────
            Optional<UUID> fingerprint = activityPort.findDuplicate(
                    userId, startedAt, sport, durationSec);
            if (fingerprint.isPresent()) {
                log.info("Garmin activity duplicate (Layer-2 fingerprint): userId={} summaryId={} matched={}",
                        userId, summaryId, fingerprint.get());
                syncLogPort.complete(logId, "skipped", fingerprint.get(),
                        "cross-source duplicate, fingerprint match");
                return;
            }

            // ── Persist activity ──────────────────────────────────────────────
            UUID activityId = activityPort.save(
                    userId, PROVIDER, summaryId, sport, subSport,
                    name, startedAt, durationSec, distMeters, elevMeters);

            // ── Update with detailed metrics ──────────────────────────────────
            Integer avgHr     = getInt(d, "averageHeartRateInBeatsPerMinute");
            Integer maxHr     = getInt(d, "maxHeartRateInBeatsPerMinute");
            Double  avgPowerD = getDouble(d, "averagePowerInWatts");
            Integer avgPower  = avgPowerD != null ? (int) Math.round(avgPowerD) : null;
            Integer maxPower  = getInt(d, "maxPowerInWatts");
            Integer avgCad    = getInt(d, "averageCadenceInRoundsPerMinute");
            Integer calories  = getInt(d, "activeKilocalories");

            activityPort.updateFromStrava(activityId, name, null,
                    avgHr, maxHr, avgPower, maxPower, null,
                    null, null, avgCad, distMeters, calories, elevMeters);

            // ── Persist laps ──────────────────────────────────────────────────
            List<Map<String, Object>> lapsRaw = getList(d, "laps");
            if (lapsRaw != null && !lapsRaw.isEmpty()) {
                lapPort.replaceAll(activityId, normalizeLaps(lapsRaw));
            }

            syncLogPort.complete(logId, "success", activityId, null);
            log.info("Garmin activity synced: userId={} activityId={} summaryId={} sport={}",
                    userId, activityId, summaryId, sport);

        } catch (Exception e) {
            log.error("Garmin activity failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    // ── Activity details (streams) ────────────────────────────────────────────

    /**
     * Processes a {@code garmin_activity_details} job.
     *
     * <p>Matches the parent activity by {@code summaryId}, then stores the per-second
     * data as {@code activity_streams}. If the parent activity doesn't exist yet
     * (race condition with activity summary push), this is gracefully skipped.
     */
    @Transactional
    public void processActivityDetails(UUID userId, UUID logId, String payload) {
        try {
            Map<String, Object> d = parsePayload(payload);
            String summaryId = getString(d, "summaryId");

            // Find parent activity — may arrive before the summary (out-of-order)
            Optional<UUID> activityId = activityPort.findIdByUserSourceAndSourceId(
                    userId, PROVIDER, summaryId);

            if (activityId.isEmpty()) {
                // Race condition: activity-details arrived before the activity summary.
                // Stage the details for reconciliation rather than dropping permanently.
                stageOrphanedDetails(userId, logId, summaryId, payload);
                return;
            }

            storeStreams(userId, logId, activityId.get(), d, payload);

        } catch (Exception e) {
            log.error("Garmin activity-details failed: userId={} logId={} error={}", userId, logId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e;
        }
    }

    /**
     * Called periodically (e.g. every 5 minutes) to reconcile staged activity details
     * that were waiting for their parent activity summary.
     *
     * <p>Looks for pending rows in {@code activity_details_staging} and re-attempts processing.
     * Rows older than 7 days with no parent are marked as {@code error}.
     */
    @Transactional
    public void reconcileStagedDetails(UUID userId) {
        var staged = jdbcClient.sql("""
                SELECT id, summary_id, payload_json, sync_log_id, attempt_count
                  FROM activity_details_staging
                 WHERE user_id = :userId
                   AND source  = 'garmin'
                   AND status  = 'pending'
                   AND attempt_count < 5
                   AND created_at > now() - INTERVAL '7 days'
                ORDER BY created_at ASC
                """)
                .param("userId", userId)
                .query((rs, n) -> new StagedRow(
                        (UUID) rs.getObject("id"),
                        rs.getString("summary_id"),
                        rs.getString("payload_json"),
                        (UUID) rs.getObject("sync_log_id"),
                        rs.getInt("attempt_count")))
                .list();

        for (StagedRow row : staged) {
            Optional<UUID> activityId = activityPort.findIdByUserSourceAndSourceId(
                    userId, PROVIDER, row.summaryId());

            if (activityId.isEmpty()) {
                // Parent still not found — increment attempt count
                jdbcClient.sql("""
                        UPDATE activity_details_staging
                           SET attempt_count = attempt_count + 1,
                               last_error    = 'parent activity not yet found'
                         WHERE id = :id
                        """)
                        .param("id", row.id())
                        .update();
                continue;
            }

            // Parent found — process the details and mark as reconciled
            try {
                Map<String, Object> d = parsePayload(row.payloadJson());
                storeStreams(userId, row.syncLogId(), activityId.get(), d, row.payloadJson());

                jdbcClient.sql("""
                        UPDATE activity_details_staging
                           SET status        = 'reconciled',
                               reconciled_at = now()
                         WHERE id = :id
                        """)
                        .param("id", row.id())
                        .update();
                log.info("Reconciled staged activity-details: userId={} summaryId={} activityId={}",
                        userId, row.summaryId(), activityId.get());
            } catch (Exception e) {
                jdbcClient.sql("""
                        UPDATE activity_details_staging
                           SET attempt_count = attempt_count + 1,
                               last_error    = :error
                         WHERE id = :id
                        """)
                        .param("id",    row.id())
                        .param("error", e.getMessage())
                        .update();
                log.error("Staged activity-details reconciliation failed: id={} error={}", row.id(), e.getMessage());
            }
        }

        // Mark truly abandoned rows (>7 days, parent never arrived) as error
        jdbcClient.sql("""
                UPDATE activity_details_staging
                   SET status = 'error', last_error = 'parent activity never arrived (7d timeout)'
                 WHERE user_id = :userId
                   AND source  = 'garmin'
                   AND status  = 'pending'
                   AND created_at <= now() - INTERVAL '7 days'
                """)
                .param("userId", userId)
                .update();
    }

    private void stageOrphanedDetails(UUID userId, UUID logId, String summaryId, String payload) {
        jdbcClient.sql("""
                INSERT INTO activity_details_staging
                    (id, user_id, source, summary_id, payload_json, sync_log_id, status, created_at)
                VALUES
                    (gen_random_uuid(), :userId, 'garmin', :summaryId, :payload, :logId, 'pending', now())
                ON CONFLICT DO NOTHING
                """)
                .param("userId",    userId)
                .param("summaryId", summaryId)
                .param("payload",   payload)
                .param("logId",     logId)
                .update();

        syncLogPort.complete(logId, "staged", null,
                "activity-details staged for reconciliation — parent summaryId=" + summaryId + " not yet arrived");
        log.info("Garmin activity-details staged (race condition): userId={} summaryId={}", userId, summaryId);
    }

    @SuppressWarnings("unchecked")
    private void storeStreams(UUID userId, UUID logId, UUID activityId,
                              Map<String, Object> d, String payload) {
        List<Map<String, Object>> samples = getList(d, "samples");
        if (samples == null || samples.isEmpty()) {
            if (logId != null) syncLogPort.complete(logId, "skipped", activityId, "no samples in payload");
            return;
        }

        StreamData streams = normalizeSamples(samples);
        if (streams != null) {
            streamPort.upsert(activityId, streams);
        }

        if (logId != null) syncLogPort.complete(logId, "success", activityId, null);
        log.info("Garmin activity-details synced: userId={} activityId={} samples={}", userId, activityId, samples.size());
    }

    private record StagedRow(UUID id, String summaryId, String payloadJson, UUID syncLogId, int attemptCount) {}


    // ── Normalization ─────────────────────────────────────────────────────────

    /**
     * Maps Garmin activity type to CoachFit internal sport string.
     * See docs/04-db-schema.md §activities.sport.
     */
    static String normalizeSport(String garminType) {
        if (garminType == null) return "other";
        return switch (garminType.toUpperCase()) {
            case "CYCLING", "INDOOR_CYCLING", "VIRTUAL_RIDE", "MOUNTAIN_BIKING",
                 "GRAVEL_CYCLING", "ROAD_BIKING", "E_BIKE_FITNESS", "CYCLING_COMMUTE" -> "cycling";
            case "RUNNING", "TRACK_RUNNING", "TRAIL_RUNNING", "INDOOR_RUNNING",
                 "VIRTUAL_RUN"                                                          -> "running";
            case "SWIMMING", "OPEN_WATER_SWIMMING", "POOL_SWIMMING"                    -> "swimming";
            case "WALKING", "HIKING"                                                    -> "walking";
            case "STRENGTH_TRAINING", "FUNCTIONAL_STRENGTH",
                 "INDOOR_ROWING", "YOGA"                                                -> "strength";
            default                                                                     -> "other";
        };
    }

    /**
     * Maps Garmin activity type to CoachFit sub-sport.
     * Returns null for types that don't have a meaningful sub-sport.
     */
    static String normalizeSubSport(String garminType) {
        if (garminType == null) return null;
        return switch (garminType.toUpperCase()) {
            case "INDOOR_CYCLING", "VIRTUAL_RIDE" -> "indoor_cycling";
            case "MOUNTAIN_BIKING"                -> "mountain_biking";
            case "TRAIL_RUNNING"                  -> "trail_running";
            case "OPEN_WATER_SWIMMING"            -> "open_water";
            case "POOL_SWIMMING"                  -> "pool";
            default                               -> null;
        };
    }

    /**
     * Converts a list of Garmin per-second samples into a {@link StreamData} record.
     * Missing fields default to null (not stored); samples without timing data are skipped.
     */
    private StreamData normalizeSamples(List<Map<String, Object>> samples) {
        int n = samples.size();
        int[]    timestamps = new int[n];
        short[]  heartRates = new short[n];
        short[]  powers     = new short[n];
        short[]  cadences   = new short[n];
        float[]  speeds     = new float[n];
        float[]  alts       = new float[n];
        double[] lats       = new double[n];
        double[] lngs       = new double[n];
        float[]  dists      = new float[n];

        boolean hasHr   = false, hasPwr = false, hasCad = false;
        boolean hasSpd  = false, hasAlt = false, hasGps = false, hasDist = false;

        long baseTime = -1;
        for (int i = 0; i < n; i++) {
            Map<String, Object> s = samples.get(i);
            Long t = getLong(s, "startTimeInSeconds");
            if (t == null) continue;
            if (baseTime < 0) baseTime = t;
            timestamps[i] = (int)(t - baseTime);

            Number hr   = getNumber(s, "heartRate");
            Number pwr  = getNumber(s, "powerInWatts");
            Number cad  = getNumber(s, "cadenceInRPM");
            Number spd  = getNumber(s, "speedMetersPerSecond");
            Number alt  = getNumber(s, "elevationInMeters");
            Number lat  = getNumber(s, "latitudeInDegree");
            Number lng  = getNumber(s, "longitudeInDegree");
            Number dist = getNumber(s, "totalDistanceInMeters");

            if (hr   != null) { heartRates[i] = hr.shortValue();   hasHr   = true; }
            if (pwr  != null) { powers[i]     = pwr.shortValue();  hasPwr  = true; }
            if (cad  != null) { cadences[i]   = cad.shortValue();  hasCad  = true; }
            if (spd  != null) { speeds[i]     = spd.floatValue();  hasSpd  = true; }
            if (alt  != null) { alts[i]       = alt.floatValue();  hasAlt  = true; }
            if (lat  != null) { lats[i]       = lat.doubleValue(); hasGps  = true; }
            if (lng  != null) { lngs[i]       = lng.doubleValue(); }
            if (dist != null) { dists[i]      = dist.floatValue(); hasDist = true; }
        }

        if (!hasHr && !hasPwr && !hasSpd) return null; // no meaningful data

        return new StreamData(
                timestamps,
                hasHr   ? heartRates : null,
                hasPwr  ? powers     : null,
                hasCad  ? cadences   : null,
                hasSpd  ? speeds     : null,
                hasAlt  ? alts       : null,
                hasGps  ? lats       : null,
                hasGps  ? lngs       : null,
                hasDist ? dists      : null,
                null,   // temperature — not in Garmin push samples
                null    // grade — not in Garmin push samples
        );
    }

    private List<LapData> normalizeLaps(List<Map<String, Object>> laps) {
        List<LapData> result = new ArrayList<>(laps.size());
        short idx = 0;
        for (Map<String, Object> lap : laps) {
            Long startSec = getLong(lap, "startTimeInSeconds");
            Instant lapStart = startSec != null ? Instant.ofEpochSecond(startSec) : null;
            Integer dur = getInt(lap, "durationInSeconds");
            Double distM = getDouble(lap, "distanceInMeters");
            Integer avgHr = getInt(lap, "averageHeartRateInBeatsPerMinute");
            Integer maxHr = getInt(lap, "maxHeartRateInBeatsPerMinute");
            Double avgPwrD = getDouble(lap, "averagePowerInWatts");
            Integer avgPwr = avgPwrD != null ? (int) Math.round(avgPwrD) : null;
            Integer maxPwr = getInt(lap, "maxPowerInWatts");
            Integer avgCad = getInt(lap, "averageCadenceInRoundsPerMinute");

            result.add(new LapData(
                    idx++,
                    lapStart,
                    dur,
                    distM != null ? BigDecimal.valueOf(distM).setScale(2, RoundingMode.HALF_UP) : null,
                    avgHr, maxHr, avgPwr, maxPwr, avgCad,
                    null, null
            ));
        }
        return result;
    }

    // ── Payload helpers ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse Garmin activity payload: " + e.getMessage(), e);
        }
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

    private Number getNumber(Map<String, Object> d, String key) {
        Object v = d.get(key);
        return v instanceof Number n ? n : null;
    }

    private String getString(Map<String, Object> d, String key) {
        Object v = d.get(key);
        return v instanceof String s ? s : null;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getList(Map<String, Object> d, String key) {
        Object v = d.get(key);
        if (v instanceof List<?> l) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : l) {
                if (item instanceof Map<?, ?> m) result.add((Map<String, Object>) m);
            }
            return result;
        }
        return null;
    }
}
