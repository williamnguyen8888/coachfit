package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.FileParseException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import com.garmin.fit.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses Garmin FIT binary files using the official Garmin FIT SDK.
 *
 * <h3>Message mapping (per docs/06-sync-engine-spec.md)</h3>
 * <ul>
 *   <li>{@code SessionMesg}  → {@link ParsedActivity} summary metrics</li>
 *   <li>{@code LapMesg[]}   → {@link ParsedLap} list</li>
 *   <li>{@code RecordMesg[]} → {@link ParsedStreams} arrays</li>
 *   <li>{@code FileIdMesg}  → activity name (sport + manufacturer)</li>
 * </ul>
 *
 * <p>Latitude/longitude semicircles are converted to decimal degrees via:
 * {@code degrees = semicircles * 180 / 2^31}
 */
@Component
public class FitParser {

    private static final Logger log = LoggerFactory.getLogger(FitParser.class);

    /** Conversion factor: FIT semicircles → decimal degrees. */
    private static final double SEMICIRCLE_TO_DEGREE = 180.0 / Math.pow(2, 31);

    /**
     * Parses raw FIT bytes into a {@link ParsedActivity}.
     *
     * @param fileBytes raw .fit file content
     * @return normalised activity data
     * @throws FileParseException if the FIT file is corrupt or unreadable
     */
    public ParsedActivity parse(byte[] fileBytes) {
        // Accumulators populated by listeners
        SessionHolder   session = new SessionHolder();
        List<LapMesg>   lapMesgs = new ArrayList<>();
        List<RecordMesg> records = new ArrayList<>();

        try {
            Decode          decoder     = new Decode();
            MesgBroadcaster broadcaster = new MesgBroadcaster(decoder);

            broadcaster.addListener((SessionMesgListener)  mesg -> session.set(mesg));
            broadcaster.addListener((LapMesgListener)      mesg -> lapMesgs.add(mesg));
            broadcaster.addListener((RecordMesgListener)   mesg -> records.add(mesg));

            boolean ok = decoder.read(new ByteArrayInputStream(fileBytes), broadcaster, broadcaster);
            if (!ok) {
                throw new FileParseException("FIT", "Decoder returned false — file may be incomplete");
            }
        } catch (FitRuntimeException e) {
            throw new FileParseException("FIT", e.getMessage(), e);
        }

        if (session.mesg == null) {
            throw new FileParseException("FIT", "No SessionMesg found — file may not contain activity data");
        }

        return buildParsedActivity(session.mesg, lapMesgs, records);
    }

    // ── Build normalised model ────────────────────────────────────────────────

    private ParsedActivity buildParsedActivity(SessionMesg session,
                                               List<LapMesg> lapMesgs,
                                               List<RecordMesg> records) {
        String sport    = mapSport(session.getSport());
        String subSport = mapSubSport(session.getSubSport());
        String name     = buildName(sport, session.getStartTime());

        Instant startedAt = fitTimestampToInstant(session.getStartTime());
        int durationSeconds = session.getTotalElapsedTime() != null
                ? session.getTotalElapsedTime().intValue() : 0;

        Integer movingTime = session.getTotalTimerTime() != null
                ? session.getTotalTimerTime().intValue() : null;

        BigDecimal distanceMeters = session.getTotalDistance() != null
                ? BigDecimal.valueOf(session.getTotalDistance()).setScale(2, RoundingMode.HALF_UP)
                : null;
        BigDecimal elevationGain = session.getTotalAscent() != null
                ? BigDecimal.valueOf(session.getTotalAscent()).setScale(2, RoundingMode.HALF_UP)
                : null;
        Integer calories    = session.getTotalCalories() != null
                ? session.getTotalCalories().intValue() : null;
        Integer avgHr       = session.getAvgHeartRate() != null
                ? session.getAvgHeartRate().intValue() : null;
        Integer maxHr       = session.getMaxHeartRate() != null
                ? session.getMaxHeartRate().intValue() : null;
        Integer avgPower    = session.getAvgPower() != null
                ? session.getAvgPower().intValue() : null;
        Integer maxPower    = session.getMaxPower() != null
                ? session.getMaxPower().intValue() : null;
        Integer avgCadence  = session.getAvgCadence() != null
                ? session.getAvgCadence().intValue() : null;
        BigDecimal avgSpeed = session.getAvgSpeed() != null
                ? BigDecimal.valueOf(session.getAvgSpeed()).setScale(4, RoundingMode.HALF_UP)
                : null;

        // Start position from first record that has valid coordinates
        Double startLat = null;
        Double startLng = null;
        for (RecordMesg r : records) {
            if (r.getPositionLat() != null && r.getPositionLong() != null) {
                startLat = r.getPositionLat() * SEMICIRCLE_TO_DEGREE;
                startLng = r.getPositionLong() * SEMICIRCLE_TO_DEGREE;
                break;
            }
        }

        List<ParsedLap>  laps    = buildLaps(lapMesgs);
        ParsedStreams     streams = buildStreams(records, startedAt);

        return new ParsedActivity(
                sport, subSport, name, startedAt, durationSeconds, movingTime,
                distanceMeters, elevationGain, calories, avgHr, maxHr, avgPower, maxPower,
                avgCadence, avgSpeed, startLat, startLng, laps, streams
        );
    }

    private List<ParsedLap> buildLaps(List<LapMesg> lapMesgs) {
        List<ParsedLap> laps = new ArrayList<>();
        for (int i = 0; i < lapMesgs.size(); i++) {
            LapMesg lap = lapMesgs.get(i);
            laps.add(new ParsedLap(
                    i,
                    lap.getStartTime() != null ? fitTimestampToInstant(lap.getStartTime()) : null,
                    lap.getTotalElapsedTime() != null ? lap.getTotalElapsedTime().intValue() : null,
                    lap.getTotalDistance() != null
                            ? BigDecimal.valueOf(lap.getTotalDistance()).setScale(2, RoundingMode.HALF_UP) : null,
                    lap.getAvgHeartRate()  != null ? lap.getAvgHeartRate().intValue()  : null,
                    lap.getMaxHeartRate()  != null ? lap.getMaxHeartRate().intValue()  : null,
                    lap.getAvgPower()      != null ? lap.getAvgPower().intValue()      : null,
                    lap.getMaxPower()      != null ? lap.getMaxPower().intValue()      : null,
                    lap.getAvgCadence()    != null ? lap.getAvgCadence().intValue()    : null,
                    null, // avg pace — not directly in FIT LapMesg; could derive from speed
                    lap.getTotalAscent()   != null
                            ? BigDecimal.valueOf(lap.getTotalAscent()).setScale(2, RoundingMode.HALF_UP) : null
            ));
        }
        return laps;
    }

    private ParsedStreams buildStreams(List<RecordMesg> records, Instant activityStart) {
        if (records.isEmpty()) return ParsedStreams.empty();

        long startEpoch = activityStart.getEpochSecond();

        List<Integer> timestamps  = new ArrayList<>();
        List<Short>   heartRate   = new ArrayList<>();
        List<Short>   power       = new ArrayList<>();
        List<Short>   cadence     = new ArrayList<>();
        List<Float>   speed       = new ArrayList<>();
        List<Float>   altitude    = new ArrayList<>();
        List<Double>  latitude    = new ArrayList<>();
        List<Double>  longitude   = new ArrayList<>();
        List<Float>   distance    = new ArrayList<>();
        List<Short>   temperature = new ArrayList<>();

        boolean hasHr   = false, hasPower  = false, hasCadence = false;
        boolean hasSpeed = false, hasAlt   = false, hasGps     = false;
        boolean hasDist = false,  hasTemp  = false;

        for (RecordMesg r : records) {
            if (r.getTimestamp() == null) continue;
            int elapsed = (int) (r.getTimestamp().getDate().toInstant().getEpochSecond() - startEpoch);
            timestamps.add(elapsed);

            if (r.getHeartRate() != null) { heartRate.add(r.getHeartRate().shortValue()); hasHr = true; }
            else heartRate.add(null);

            if (r.getPower() != null) { power.add(r.getPower().shortValue()); hasPower = true; }
            else power.add(null);

            if (r.getCadence() != null) { cadence.add(r.getCadence().shortValue()); hasCadence = true; }
            else cadence.add(null);

            if (r.getSpeed() != null) { speed.add(r.getSpeed().floatValue()); hasSpeed = true; }
            else speed.add(null);

            if (r.getAltitude() != null) { altitude.add(r.getAltitude().floatValue()); hasAlt = true; }
            else altitude.add(null);

            if (r.getPositionLat() != null && r.getPositionLong() != null) {
                latitude.add(r.getPositionLat()  * SEMICIRCLE_TO_DEGREE);
                longitude.add(r.getPositionLong() * SEMICIRCLE_TO_DEGREE);
                hasGps = true;
            } else { latitude.add(null); longitude.add(null); }

            if (r.getDistance() != null) { distance.add(r.getDistance().floatValue()); hasDist = true; }
            else distance.add(null);

            if (r.getTemperature() != null) { temperature.add(r.getTemperature().shortValue()); hasTemp = true; }
            else temperature.add(null);
        }

        return new ParsedStreams(
                timestamps,
                hasHr      ? heartRate   : null,
                hasPower   ? power       : null,
                hasCadence ? cadence     : null,
                hasSpeed   ? speed       : null,
                hasAlt     ? altitude    : null,
                hasGps     ? latitude    : null,
                hasGps     ? longitude   : null,
                hasDist    ? distance    : null,
                hasTemp    ? temperature : null
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Instant fitTimestampToInstant(DateTime dt) {
        if (dt == null) return Instant.EPOCH;
        return dt.getDate().toInstant();
    }

    /**
     * Maps Garmin FIT {@link Sport} enum to CoachFit sport strings.
     * Unknown/unmapped sports fall back to "other".
     */
    private static String mapSport(Sport sport) {
        if (sport == null) return "other";
        return switch (sport) {
            case CYCLING        -> "cycling";
            case RUNNING        -> "running";
            case SWIMMING       -> "swimming";
            case HIKING         -> "hiking";
            case WALKING        -> "walking";
            case MULTISPORT     -> "multisport";
            case ROWING         -> "rowing";
            case CROSS_COUNTRY_SKIING -> "cross_country_skiing";
            case ALPINE_SKIING  -> "alpine_skiing";
            case SNOWBOARDING   -> "snowboarding";
            case PADDLING       -> "paddling";
            default             -> "other";
        };
    }

    private static String mapSubSport(SubSport subSport) {
        if (subSport == null) return null;
        return switch (subSport) {
            case ROAD          -> "road";
            case MOUNTAIN      -> "mountain";
            case TRACK         -> "track";
            case TRAIL         -> "trail";
            case VIRTUAL_ACTIVITY -> "virtual";
            case INDOOR_CYCLING -> "indoor";
            case TREADMILL     -> "treadmill";
            default            -> null;
        };
    }

    private static String buildName(String sport, DateTime startTime) {
        String base = sport.substring(0, 1).toUpperCase() + sport.substring(1) + " Activity";
        if (startTime == null) return base;
        // Simple name: "Cycling Activity" — users can rename via PUT /activities/{id}
        return base;
    }

    /** Mutable holder used inside the lambda listener. */
    private static class SessionHolder {
        SessionMesg mesg;
        void set(SessionMesg m) { this.mesg = m; }
    }
}
