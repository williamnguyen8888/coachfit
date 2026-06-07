package com.coachfit.sync.application.service;

import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import com.coachfit.athlete.application.port.out.SportZonePersistencePort;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.auth.adapter.in.StravaOAuthProperties;
import com.coachfit.auth.adapter.out.persistence.AesTokenEncryptionUtil;
import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import com.coachfit.sync.application.port.out.SyncLogPersistencePort;
import com.coachfit.sync.application.port.out.StravaTokenPort;
import com.coachfit.sync.application.port.out.StravaTokenPort.StravaTokens;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Worker service: processes a single Strava activity sync job from the Redis queue.
 *
 * <p>Pipeline (docs/06-sync-engine-spec.md §Strava Webhook Processing Step 2 Worker):
 * <ol>
 *   <li>Load &amp; decrypt Strava tokens</li>
 *   <li>Refresh token if expired</li>
 *   <li>Fetch activity summary from Strava API</li>
 *   <li>Fetch time-series streams from Strava API</li>
 *   <li>Source-level dedup check ({@code UNIQUE(user_id, 'strava', activity_id)})</li>
 *   <li>For create events: normalize → store activity + streams + laps</li>
 *   <li>For update events: merge updated fields onto existing row</li>
 *   <li>For delete events: soft-delete the activity</li>
 *   <li>Calculate NP / IF / TSS and update the stored row</li>
 *   <li>Log sync result</li>
 * </ol>
 */
@Service
public class StravaActivitySyncService {

    private static final Logger log = LoggerFactory.getLogger(StravaActivitySyncService.class);

    private static final String PROVIDER           = "strava";
    private static final String STRAVA_API_BASE    = "https://www.strava.com/api/v3";
    private static final String TOKEN_REFRESH_URL  = "https://www.strava.com/oauth/token";
    private static final String STREAM_KEYS        =
            "heartrate,watts,cadence,velocity_smooth,altitude,latlng,distance,time";

    private final StravaTokenPort               stravaTokenPort;
    private final OAuthConnectionPersistencePort oauthPort;
    private final AesTokenEncryptionUtil         encryptionUtil;
    private final StravaOAuthProperties          stravaProperties;
    private final ActivityPersistencePort        activityPort;
    private final ActivityStreamPersistencePort  streamPort;
    private final ActivityLapPersistencePort     lapPort;
    private final SyncLogPersistencePort         syncLogPort;
    private final RestClient                     restClient;
    private final SportZonePersistencePort       sportZonePort;
    private final JdbcClient                     jdbcClient;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public StravaActivitySyncService(StravaTokenPort stravaTokenPort,
                                     OAuthConnectionPersistencePort oauthPort,
                                     AesTokenEncryptionUtil encryptionUtil,
                                     StravaOAuthProperties stravaProperties,
                                     ActivityPersistencePort activityPort,
                                     ActivityStreamPersistencePort streamPort,
                                     ActivityLapPersistencePort lapPort,
                                     SyncLogPersistencePort syncLogPort,
                                     RestClient restClient,
                                     SportZonePersistencePort sportZonePort,
                                     JdbcClient jdbcClient,
                                     org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.stravaTokenPort  = stravaTokenPort;
        this.oauthPort        = oauthPort;
        this.encryptionUtil   = encryptionUtil;
        this.stravaProperties = stravaProperties;
        this.activityPort     = activityPort;
        this.streamPort       = streamPort;
        this.lapPort          = lapPort;
        this.syncLogPort      = syncLogPort;
        this.restClient       = restClient;
        this.sportZonePort    = sportZonePort;
        this.jdbcClient       = jdbcClient;
        this.eventPublisher   = eventPublisher;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Processes a single Strava sync job.
     *
     * @param userId           CoachFit user UUID
     * @param stravaActivityId Strava numeric activity ID as string
     * @param eventType        "activity_created" | "activity_updated" | "activity_deleted"
     */
    public void process(UUID userId, String stravaActivityId, String eventType) {
        UUID logId = syncLogPort.create(userId, PROVIDER, eventType, stravaActivityId, null);

        try {
            doProcess(userId, stravaActivityId, eventType, logId);
        } catch (Exception e) {
            log.error("Strava sync failed: userId={} activityId={} error={}",
                    userId, stravaActivityId, e.getMessage(), e);
            syncLogPort.complete(logId, "failed", null, e.getMessage());
            throw e; // re-throw so the consumer can retry / dead-letter
        }
    }

    // ── Private pipeline ──────────────────────────────────────────────────────

    @Transactional
    private void doProcess(UUID userId, String stravaActivityId, String eventType, UUID logId) {

        // ── Handle delete events fast ─────────────────────────────────────────
        if ("activity_deleted".equals(eventType)) {
            activityPort.findIdByUserSourceAndSourceId(userId, PROVIDER, stravaActivityId)
                    .ifPresent(id -> {
                        // Load detail before soft-delete so we have sport + startedAt for PMC recalc
                        var detail = activityPort.findDetailById(userId, id).orElse(null);
                        activityPort.softDelete(id);
                        log.info("Soft-deleted Strava activity: userId={} activityId={}", userId, stravaActivityId);
                        syncLogPort.complete(logId, "success", id, null);
                        eventPublisher.publishEvent(new com.coachfit.shared.domain.event.ActivityDeletedEvent(
                                userId, id,
                                detail != null ? detail.sport()     : null,
                                detail != null ? detail.startedAt() : null));
                    });
            if (activityPort.findIdByUserSourceAndSourceId(userId, PROVIDER, stravaActivityId).isEmpty()) {
                log.debug("Delete event for unknown activity: userId={} activityId={}", userId, stravaActivityId);
                syncLogPort.complete(logId, "skipped", null, "activity not found locally");
            }
            return;
        }

        // ── Step 1: Load + decrypt tokens ────────────────────────────────────
        StravaTokens tokens = stravaTokenPort.loadTokens(userId)
                .orElseThrow(() -> new IllegalStateException(
                        "No Strava connection for userId=" + userId));

        String accessToken = getValidAccessToken(userId, tokens);

        // ── Step 2: Fetch activity summary ────────────────────────────────────
        StravaActivityResponse activity = fetchActivity(stravaActivityId, accessToken);
        if (activity == null) {
            log.warn("Strava activity not found (deleted?): activityId={}", stravaActivityId);
            syncLogPort.complete(logId, "skipped", null, "activity not found on Strava");
            return;
        }

        // ── Step 3: Handle update events (existing activity) ──────────────────
        if ("activity_updated".equals(eventType)) {
            Optional<UUID> existing = activityPort.findIdByUserSourceAndSourceId(
                    userId, PROVIDER, stravaActivityId);
            if (existing.isPresent()) {
                updateActivity(existing.get(), activity);
                syncLogPort.complete(logId, "success", existing.get(), null);
                log.info("Updated Strava activity: userId={} activityId={}", userId, stravaActivityId);
                return;
            }
            // Fall through to create if not found locally (out-of-order events)
        }

        // ── Step 4: Source-level dedup for create events ──────────────────────
        if (activityPort.existsByUserSourceAndSourceId(userId, PROVIDER, stravaActivityId)) {
            log.info("Duplicate Strava activity skipped: userId={} activityId={}", userId, stravaActivityId);
            syncLogPort.complete(logId, "skipped", null, "duplicate");
            return;
        }

        // ── Step 5: Fetch streams ─────────────────────────────────────────────
        StravaStreamsResponse streams = fetchStreams(stravaActivityId, accessToken);

        // ── Step 6: Persist activity row ─────────────────────────────────────
        String sport = normalizeSport(activity.type(), activity.sportType());

        UUID activityId = activityPort.save(
                userId,
                PROVIDER,
                stravaActivityId,
                sport,
                null,
                activity.name() != null ? activity.name() : "Strava Activity",
                activity.startDateLocal() != null
                        ? Instant.parse(activity.startDateLocal().endsWith("Z")
                                ? activity.startDateLocal()
                                : activity.startDateLocal() + "Z")
                        : Instant.now(),
                activity.movingTime() != null ? activity.movingTime() : 0,
                activity.distance()   != null ? BigDecimal.valueOf(activity.distance()).setScale(2, RoundingMode.HALF_UP) : null,
                activity.totalElevationGain() != null
                        ? BigDecimal.valueOf(activity.totalElevationGain()).setScale(2, RoundingMode.HALF_UP)
                        : null
        );

        // ── Step 7: Calculate metrics + update activity ───────────────────────
        int[] powerStream = extractPowerStream(streams);
        Integer np = StravaMetricsCalculator.calculateNp(powerStream);

        // Load user's power zone to get FTP for IF/TSS calculation
        Optional<SportZone> powerZone = sportZonePort.findLatestBySportAndType(userId, sport, "power");
        Integer ftp = powerZone.map(SportZone::ftp).orElse(null);

        BigDecimal intensityFactor = null;
        BigDecimal tss             = null;
        Integer    normalizedPower = np;

        if (np != null && ftp != null && ftp > 0) {
            // Power-based TSS (most accurate — use when power stream is available)
            intensityFactor = StravaMetricsCalculator.calculateIf(np, ftp);
            if (intensityFactor != null && activity.movingTime() != null && activity.movingTime() > 0) {
                tss = StravaMetricsCalculator.calculateTss(
                        activity.movingTime(), np, intensityFactor, ftp);
            }
            log.debug("Power TSS: userId={} sport={} np={}W ftp={}W if={} tss={}",
                    userId, sport, np, ftp, intensityFactor, tss);
        } else if (np == null && "running".equals(sport)
                && activity.averageSpeed() != null && activity.averageSpeed() > 0
                && activity.movingTime() != null && activity.movingTime() > 0) {
            // rTSS: Running TSS — pace-based, no power meter needed
            Optional<SportZone> paceZone = sportZonePort.findLatestBySportAndType(userId, sport, "pace");
            Integer thresholdPace = paceZone.map(SportZone::thresholdPace).orElse(null);
            if (thresholdPace != null && thresholdPace > 0) {
                // Convert m/s speed to sec/km pace
                double avgPaceSecPerKm = 1000.0 / activity.averageSpeed();
                tss = StravaMetricsCalculator.calculateRtss(
                        activity.movingTime(), avgPaceSecPerKm, thresholdPace);
                log.debug("rTSS: userId={} sport={} pace={:.1f}s/km threshold={}s/km tss={}",
                        userId, sport, avgPaceSecPerKm, thresholdPace, tss);
            } else {
                // Fallback to hrTSS when no threshold pace is configured
                tss = computeHrTss(userId, sport, activity);
            }
        } else if (np == null && "swimming".equals(sport)
                && activity.averageSpeed() != null && activity.averageSpeed() > 0
                && activity.movingTime() != null && activity.movingTime() > 0) {
            // sTSS: Swim TSS — CSS-based
            Optional<SportZone> paceZone = sportZonePort.findLatestBySportAndType(userId, sport, "pace");
            Integer css = paceZone.map(SportZone::css).orElse(null);
            if (css != null && css > 0) {
                // Convert m/s speed to sec/100m pace
                double avgPaceSecPer100m = 100.0 / activity.averageSpeed();
                tss = StravaMetricsCalculator.calculateStss(
                        activity.movingTime(), avgPaceSecPer100m, css);
                log.debug("sTSS: userId={} css={}s/100m tss={}", userId, css, tss);
            } else {
                tss = computeHrTss(userId, sport, activity);
            }
        } else if (np == null && activity.averageHeartrate() != null && activity.maxHeartrate() != null
                && activity.movingTime() != null && activity.movingTime() > 0) {
            // hrTSS fallback: all other sports or when no pace threshold configured
            tss = computeHrTss(userId, sport, activity);
        }

        // Update activity row with all computed metrics + Strava-specific fields
        activityPort.updateFromStrava(
                activityId,
                activity.name(),
                activity.description(),
                activity.averageHeartrate() != null ? activity.averageHeartrate().intValue() : null,
                activity.maxHeartrate()     != null ? activity.maxHeartrate().intValue() : null,
                activity.averageWatts()     != null ? (int) Math.round(activity.averageWatts()) : null,
                activity.maxWatts(),
                normalizedPower,
                tss,
                intensityFactor,
                activity.averageCadence()   != null ? (int) Math.round(activity.averageCadence()) : null,
                activity.distance()         != null ? BigDecimal.valueOf(activity.distance()).setScale(2, RoundingMode.HALF_UP) : null,
                activity.calories(),
                activity.totalElevationGain() != null ? BigDecimal.valueOf(activity.totalElevationGain()).setScale(2, RoundingMode.HALF_UP) : null
        );

        // ── Step 8: Persist streams ───────────────────────────────────────────
        if (streams != null) {
            StreamData streamData = normalizeStreams(streams);
            if (streamData != null) streamPort.upsert(activityId, streamData);
        }

        // ── Step 9: Persist laps ──────────────────────────────────────────────
        if (activity.laps() != null && !activity.laps().isEmpty()) {
            lapPort.replaceAll(activityId, normalizeLaps(activity.laps()));
        }

        syncLogPort.complete(logId, "success", activityId, null);
        log.info("Strava activity synced: userId={} activityId={} stravaId={}", userId, activityId, stravaActivityId);

        eventPublisher.publishEvent(new com.coachfit.shared.domain.event.ActivityCreatedEvent(
                userId,
                activityId,
                sport,
                activity.name() != null ? activity.name() : "Strava Activity",
                activity.description(),
                activity.startDateLocal() != null
                        ? Instant.parse(activity.startDateLocal().endsWith("Z")
                                ? activity.startDateLocal()
                                : activity.startDateLocal() + "Z")
                        : Instant.now(),
                activity.movingTime() != null ? activity.movingTime() : 0,
                activity.distance() != null ? BigDecimal.valueOf(activity.distance()) : null,
                tss
        ));
    }

    // ── Token refresh ─────────────────────────────────────────────────────────

    /**
     * Returns a valid access token. Refreshes if expired or expiry is within 60 seconds.
     */
    private String getValidAccessToken(UUID userId, StravaTokens tokens) {
        boolean needsRefresh = tokens.tokenExpiresAt() == null
                || Instant.now().isAfter(tokens.tokenExpiresAt().minusSeconds(60));

        if (!needsRefresh) {
            return encryptionUtil.decrypt(tokens.encryptedAccessToken());
        }

        log.info("Refreshing Strava access token for userId={}", userId);

        StravaRefreshResponse refreshed = restClient.post()
                .uri(TOKEN_REFRESH_URL)
                .body(Map.of(
                        "client_id",     stravaProperties.clientId(),
                        "client_secret", stravaProperties.clientSecret(),
                        "grant_type",    "refresh_token",
                        "refresh_token", encryptionUtil.decrypt(tokens.encryptedRefreshToken())
                ))
                .retrieve()
                .body(StravaRefreshResponse.class);

        if (refreshed == null || refreshed.accessToken() == null) {
            throw new IllegalStateException("Strava token refresh returned null for userId=" + userId);
        }

        Instant expiresAt = refreshed.expiresAt() != null
                ? Instant.ofEpochSecond(refreshed.expiresAt())
                : Instant.now().plusSeconds(21600);

        oauthPort.upsert(
                userId, PROVIDER,
                null, // provider_user_id already set — UPSERT will keep it
                encryptionUtil.encrypt(refreshed.accessToken()),
                encryptionUtil.encrypt(refreshed.refreshToken()),
                expiresAt,
                new String[]{"activity:read_all", "profile:read_all"}
        );

        log.info("Strava token refreshed for userId={}, expires={}", userId, expiresAt);
        return refreshed.accessToken();
    }

    // ── Strava API calls ──────────────────────────────────────────────────────

    private StravaActivityResponse fetchActivity(String stravaActivityId, String accessToken) {
        try {
            return restClient.get()
                    .uri(STRAVA_API_BASE + "/activities/" + stravaActivityId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(StravaActivityResponse.class);
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    private StravaStreamsResponse fetchStreams(String stravaActivityId, String accessToken) {
        try {
            return restClient.get()
                    .uri(STRAVA_API_BASE + "/activities/" + stravaActivityId
                            + "/streams?keys=" + STREAM_KEYS + "&key_by_type=true")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(StravaStreamsResponse.class);
        } catch (Exception e) {
            log.warn("Failed to fetch streams for activityId={}: {}", stravaActivityId, e.getMessage());
            return null;
        }
    }

    // ── Athlete profile helpers ────────────────────────────────────────────────

    /**
     * Loads the athlete's most recent resting heart rate from the wellness log.
     * Falls back to 60 bpm if no wellness entry exists.
     */
    private int loadLatestRestingHr(UUID userId) {
        return jdbcClient.sql("""
                SELECT resting_hr FROM wellness_logs
                 WHERE user_id   = :userId
                   AND resting_hr IS NOT NULL
                 ORDER BY date DESC
                 LIMIT 1
                """)
                .param("userId", userId)
                .query(Integer.class)
                .optional()
                .orElse(60);
    }

    /**
     * Determines whether the athlete is male by querying the users table.
     * Returns {@code true} (male) if no gender data is available.
     */
    private boolean loadIsMale(UUID userId) {
        return jdbcClient.sql("""
                SELECT COALESCE(gender, 'male') FROM users WHERE id = :userId
                """)
                .param("userId", userId)
                .query(String.class)
                .optional()
                .map(g -> !"female".equalsIgnoreCase(g))
                .orElse(true);
    }

    /**
     * Computes hrTSS for an activity, loading athlete-specific values (maxHr, restingHr, gender)
     * from the database. Returns {@code null} if heart rate data is not available.
     */
    private BigDecimal computeHrTss(UUID userId, String sport, StravaActivityResponse activity) {
        if (activity.averageHeartrate() == null || activity.maxHeartrate() == null
                || activity.movingTime() == null || activity.movingTime() <= 0) {
            return null;
        }
        Optional<SportZone> hrZone = sportZonePort.findLatestBySportAndType(userId, sport, "heart_rate");
        int athleteMaxHr = hrZone.map(SportZone::maxHr)
                                 .filter(v -> v != null && v > 0)
                                 .orElse(activity.maxHeartrate().intValue());
        int restingHr    = loadLatestRestingHr(userId);
        boolean isMale   = loadIsMale(userId);

        BigDecimal tss = StravaMetricsCalculator.calculateHrTss(
                activity.movingTime(),
                activity.averageHeartrate().intValue(),
                activity.maxHeartrate().intValue(),
                restingHr,
                athleteMaxHr,
                isMale
        );
        log.debug("hrTSS: userId={} sport={} avgHr={} maxHr={} restingHr={} athleteMaxHr={} male={} tss={}",
                userId, sport, activity.averageHeartrate(), activity.maxHeartrate(),
                restingHr, athleteMaxHr, isMale, tss);
        return tss;
    }


    // ── Normalization helpers ─────────────────────────────────────────────────


    private void updateActivity(UUID activityId, StravaActivityResponse a) {
        activityPort.updateFromStrava(
                activityId,
                a.name(),
                a.description(),
                a.averageHeartrate() != null ? a.averageHeartrate().intValue() : null,
                a.maxHeartrate()     != null ? a.maxHeartrate().intValue() : null,
                a.averageWatts()     != null ? (int) Math.round(a.averageWatts()) : null,
                a.maxWatts(),
                null,
                null,
                null,
                a.averageCadence()   != null ? (int) Math.round(a.averageCadence()) : null,
                a.distance()         != null ? BigDecimal.valueOf(a.distance()).setScale(2, RoundingMode.HALF_UP) : null,
                a.calories(),
                a.totalElevationGain() != null ? BigDecimal.valueOf(a.totalElevationGain()).setScale(2, RoundingMode.HALF_UP) : null
        );
    }

    /**
     * Maps Strava sport type to CoachFit internal sport string.
     * Strava uses "sport_type" (new) or "type" (legacy) — prefer sport_type.
     */
    private String normalizeSport(String type, String sportType) {
        String raw = sportType != null ? sportType : (type != null ? type : "");
        return switch (raw.toLowerCase()) {
            case "ride", "virtualride", "ebikeride", "handcycle", "velomobile" -> "cycling";
            case "run", "virtualrun", "trail run", "trailrun"                  -> "running";
            case "swim", "openwatersim", "openwater swim"                      -> "swimming";
            case "walk", "hike"                                                -> "walking";
            default -> raw.isEmpty() ? "other" : raw.toLowerCase();
        };
    }

    private int[] extractPowerStream(StravaStreamsResponse streams) {
        if (streams == null || streams.watts() == null || streams.watts().data() == null) return null;
        List<Integer> data = streams.watts().data();
        int[] arr = new int[data.size()];
        for (int i = 0; i < data.size(); i++) {
            arr[i] = data.get(i) != null ? data.get(i) : 0;
        }
        return arr;
    }

    private StreamData normalizeStreams(StravaStreamsResponse s) {
        int[]    time     = toIntArray(s.time()     != null ? s.time().data()             : null);
        short[]  hr       = toShortArray(s.heartrate() != null ? s.heartrate().data()     : null);
        short[]  power    = toShortArray(s.watts()     != null ? s.watts().data()         : null);
        short[]  cadence  = toShortArray(s.cadence()   != null ? s.cadence().data()       : null);
        float[]  speed    = toFloatArray(s.velocitySmooth() != null ? s.velocitySmooth().data() : null);
        float[]  alt      = toFloatArray(s.altitude()  != null ? s.altitude().data()      : null);
        float[]  dist     = toFloatArray(s.distance()  != null ? s.distance().data()      : null);

        double[] lat = null;
        double[] lng = null;
        if (s.latlng() != null && s.latlng().data() != null) {
            List<List<Double>> latlng = s.latlng().data();
            lat = new double[latlng.size()];
            lng = new double[latlng.size()];
            for (int i = 0; i < latlng.size(); i++) {
                List<Double> pair = latlng.get(i);
                lat[i] = pair != null && pair.size() > 0 ? pair.get(0) : 0.0;
                lng[i] = pair != null && pair.size() > 1 ? pair.get(1) : 0.0;
            }
        }

        if (time == null && hr == null && power == null && speed == null) return null;

        return new StreamData(time, hr, power, cadence, speed, alt, lat, lng, dist, null, null);
    }

    private List<LapData> normalizeLaps(List<StravaLap> laps) {
        List<LapData> result = new ArrayList<>(laps.size());
        for (StravaLap lap : laps) {
            result.add(new LapData(
                    (short) (lap.lapIndex() != null ? lap.lapIndex() : 0),
                    lap.startDate() != null ? Instant.parse(lap.startDate()) : null,
                    lap.elapsedTime(),
                    lap.distance() != null ? BigDecimal.valueOf(lap.distance()).setScale(2, RoundingMode.HALF_UP) : null,
                    lap.averageHeartrate() != null ? lap.averageHeartrate().intValue() : null,
                    lap.maxHeartrate()     != null ? lap.maxHeartrate().intValue() : null,
                    lap.averageWatts()     != null ? lap.averageWatts().intValue() : null,
                    lap.maxWatts(),
                    null,  // normalizedPower
                    lap.averageCadence()   != null ? lap.averageCadence().intValue() : null,
                    null,  // avgPace
                    null,  // maxSpeed
                    null,  // elevationGain
                    null,  // elevationDescent
                    null   // lapTrigger
            ));
        }
        return result;
    }

    // ── Primitive array converters ────────────────────────────────────────────

    private static int[] toIntArray(List<? extends Number> list) {
        if (list == null) return null;
        int[] a = new int[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i).intValue() : 0;
        return a;
    }

    private static short[] toShortArray(List<? extends Number> list) {
        if (list == null) return null;
        short[] a = new short[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i).shortValue() : 0;
        return a;
    }

    private static float[] toFloatArray(List<? extends Number> list) {
        if (list == null) return null;
        float[] a = new float[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i).floatValue() : 0f;
        return a;
    }

    // ── Strava API response DTOs ──────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StravaRefreshResponse(
            @JsonProperty("access_token")  String  accessToken,
            @JsonProperty("refresh_token") String  refreshToken,
            @JsonProperty("expires_at")    Long    expiresAt
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StravaActivityResponse(
            Long              id,
            String            name,
            String            description,
            String            type,
            @JsonProperty("sport_type")           String  sportType,
            @JsonProperty("start_date_local")     String  startDateLocal,
            @JsonProperty("moving_time")          Integer movingTime,
            @JsonProperty("elapsed_time")         Integer elapsedTime,
            Double                                distance,
            @JsonProperty("total_elevation_gain") Double  totalElevationGain,
            @JsonProperty("average_heartrate")    Double  averageHeartrate,
            @JsonProperty("max_heartrate")        Double  maxHeartrate,
            @JsonProperty("average_watts")        Double  averageWatts,
            @JsonProperty("max_watts")            Integer maxWatts,
            @JsonProperty("average_cadence")      Double  averageCadence,
            @JsonProperty("average_speed")        Double  averageSpeed,
            @JsonProperty("kilojoules")           Double  kilojoules,
            Integer                               calories,
            @JsonProperty("start_latlng")         List<Double> startLatlng,
            List<StravaLap>                       laps
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StravaLap(
            @JsonProperty("lap_index")        Integer lapIndex,
            @JsonProperty("start_date")       String  startDate,
            @JsonProperty("elapsed_time")     Integer elapsedTime,
            Double                            distance,
            @JsonProperty("average_heartrate") Double  averageHeartrate,
            @JsonProperty("max_heartrate")     Double  maxHeartrate,
            @JsonProperty("average_watts")     Double  averageWatts,
            @JsonProperty("max_watts")         Integer maxWatts,
            @JsonProperty("average_cadence")   Double  averageCadence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StravaStreamsResponse(
            StravaStream<Integer>       time,
            StravaStream<Integer>       heartrate,
            StravaStream<Integer>       watts,
            StravaStream<Integer>       cadence,
            @JsonProperty("velocity_smooth") StravaStream<Double> velocitySmooth,
            StravaStream<Double>        altitude,
            StravaStream<Double>        distance,
            StravaStream<List<Double>>  latlng
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StravaStream<T>(
            String      type,
            List<T>     data,
            Integer     seriesType,
            Integer     originalSize,
            String      resolution
    ) {}
}
