package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.FileParseException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import com.garmin.fit.DateTime;
import com.garmin.fit.Decode;
import com.garmin.fit.FitRuntimeException;
import com.garmin.fit.LapMesg;
import com.garmin.fit.LapMesgListener;
import com.garmin.fit.LapTrigger;
import com.garmin.fit.MesgBroadcaster;
import com.garmin.fit.RecordMesg;
import com.garmin.fit.RecordMesgListener;
import com.garmin.fit.SessionMesg;
import com.garmin.fit.SessionMesgListener;
import com.garmin.fit.Sport;
import com.garmin.fit.SubSport;
import com.garmin.fit.SwimStroke;
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
 * Extracts session, lap, and record (stream) data including extended metrics:
 * elevation descent, max speed, Garmin Training Effect, running dynamics,
 * cycling technique, and swimming metrics.
 */
@Component
public class FitParser {

    private static final Logger log = LoggerFactory.getLogger(FitParser.class);

    /** Conversion factor: FIT semicircles -> decimal degrees. */
    private static final double SEMICIRCLE_TO_DEGREE = 180.0 / Math.pow(2, 31);

    public ParsedActivity parse(byte[] fileBytes) {
        SessionHolder session = new SessionHolder();
        List<LapMesg> lapMesgs = new ArrayList<>();
        List<RecordMesg> records = new ArrayList<>();

        try {
            Decode decoder = new Decode();
            MesgBroadcaster broadcaster = new MesgBroadcaster(decoder);

            broadcaster.addListener((SessionMesgListener) session::set);
            broadcaster.addListener((LapMesgListener) lapMesgs::add);
            broadcaster.addListener((RecordMesgListener) records::add);

            boolean ok = decoder.read(new ByteArrayInputStream(fileBytes), broadcaster, broadcaster);
            if (!ok) {
                throw new FileParseException("FIT", "Decoder returned false - file may be incomplete");
            }
        } catch (FitRuntimeException e) {
            throw new FileParseException("FIT", e.getMessage(), e);
        }

        if (session.mesg == null) {
            throw new FileParseException("FIT", "No SessionMesg found - file may not contain activity data");
        }

        return buildParsedActivity(session.mesg, lapMesgs, records);
    }

    private ParsedActivity buildParsedActivity(SessionMesg session,
                                               List<LapMesg> lapMesgs,
                                               List<RecordMesg> records) {
        String sport    = mapSport(session.getSport());
        String subSport = mapSubSport(session.getSubSport());
        String name     = buildName(sport);

        Instant startedAt     = fitTimestampToInstant(session.getStartTime());
        int durationSeconds   = roundSeconds(session.getTotalElapsedTime());
        Integer movingTime    = firstNonNull(
                roundSecondsOrNull(session.getTotalMovingTime()),
                roundSecondsOrNull(session.getTotalTimerTime()));

        BigDecimal distanceMeters  = scaledDecimal(session.getTotalDistance(), 2);
        BigDecimal elevationGain   = session.getTotalAscent() != null
                ? BigDecimal.valueOf(session.getTotalAscent()).setScale(2, RoundingMode.HALF_UP)
                : null;
        BigDecimal totalDescent    = session.getTotalDescent() != null
                ? BigDecimal.valueOf(session.getTotalDescent()).setScale(2, RoundingMode.HALF_UP)
                : null;

        Integer calories     = session.getTotalCalories();
        Integer avgHr        = toInteger(session.getAvgHeartRate());
        Integer maxHr        = toInteger(session.getMaxHeartRate());
        Integer avgPower     = session.getAvgPower();
        Integer maxPower     = session.getMaxPower();
        Integer normalizedPower = session.getNormalizedPower();
        BigDecimal intensityFactor = scaledDecimal(session.getIntensityFactor(), 3);
        BigDecimal tss         = scaledDecimal(session.getTrainingStressScore(), 2);
        Integer avgCadence     = sessionAverageCadence(sport, session);

        BigDecimal avgSpeed = scaledDecimal(
                firstNonNull(session.getEnhancedAvgSpeed(), session.getAvgSpeed()), 4);
        BigDecimal maxSpeed = scaledDecimal(
                firstNonNull(session.getEnhancedMaxSpeed(), session.getMaxSpeed()), 4);

        // Temperature
        Integer avgTemperature = session.getAvgTemperature() != null
                ? session.getAvgTemperature().intValue() : null;

        // Altitude range
        BigDecimal minAltitude = scaledDecimal(
                firstNonNull(session.getEnhancedMinAltitude(), session.getMinAltitude()), 2);
        BigDecimal maxAltitude = scaledDecimal(
                firstNonNull(session.getEnhancedMaxAltitude(), session.getMaxAltitude()), 2);

        // Garmin Training Effect — correct method names in SDK 21.x
        BigDecimal aerobicTE   = scaledDecimal(session.getTotalTrainingEffect(), 1);
        BigDecimal anaerobicTE = scaledDecimal(session.getTotalAnaerobicTrainingEffect(), 1);

        // Running dynamics — correct method names in SDK 21.x
        BigDecimal avgVertOsc  = scaledDecimal(session.getAvgVerticalOscillation(), 1);
        BigDecimal avgGct      = scaledDecimal(session.getAvgStanceTime(), 1);  // getAvgStanceTime = GCT
        BigDecimal avgStepLen  = session.getAvgStepLength() != null
                ? BigDecimal.valueOf(session.getAvgStepLength()).setScale(1, RoundingMode.HALF_UP)
                : null;
        BigDecimal avgVertRatio = scaledDecimal(session.getAvgVerticalRatio(), 2);

        // Cycling technique
        BigDecimal lrBalance   = session.getLeftRightBalance() != null
                ? BigDecimal.valueOf(session.getLeftRightBalance()).setScale(1, RoundingMode.HALF_UP)
                : null;
        BigDecimal pedalSmooth = scaledDecimal(session.getAvgLeftPedalSmoothness(), 1);
        BigDecimal torqueEff   = scaledDecimal(session.getAvgLeftTorqueEffectiveness(), 1);

        // Swimming — SDK uses getAvgStrokeCount / getSwimStroke / getPoolLength
        BigDecimal poolLength  = scaledDecimal(session.getPoolLength(), 1);
        String swimStroke      = mapSwimStroke(session.getSwimStroke());
        // SWOLF = not a direct session field in SDK 21.x; derive if needed from lap data
        BigDecimal avgSwolf    = null;

        // GPS start position
        Double startLat = session.getStartPositionLat() != null
                ? semicircleToDegree(session.getStartPositionLat()) : null;
        Double startLng = session.getStartPositionLong() != null
                ? semicircleToDegree(session.getStartPositionLong()) : null;
        if (startLat == null || startLng == null) {
            double[] fallback = firstRecordedCoordinates(records);
            if (startLat == null && !Double.isNaN(fallback[0])) startLat = fallback[0];
            if (startLng == null && !Double.isNaN(fallback[1])) startLng = fallback[1];
        }

        List<ParsedLap>  laps    = buildLaps(lapMesgs, sport);
        ParsedStreams     streams = buildStreams(records, startedAt);

        return new ParsedActivity(
                sport, subSport, name, startedAt,
                durationSeconds, movingTime,
                distanceMeters, elevationGain, totalDescent,
                calories,
                avgHr, maxHr,
                avgPower, maxPower, normalizedPower,
                intensityFactor, tss,
                avgCadence,
                avgSpeed, maxSpeed,
                avgTemperature,
                minAltitude, maxAltitude,
                aerobicTE, anaerobicTE,
                avgVertOsc, avgGct, avgStepLen, avgVertRatio,
                lrBalance, pedalSmooth, torqueEff,
                poolLength, swimStroke, avgSwolf,
                startLat, startLng,
                laps, streams
        );
    }

    // ── Laps ──────────────────────────────────────────────────────────────────

    private List<ParsedLap> buildLaps(List<LapMesg> lapMesgs, String sport) {
        List<ParsedLap> laps = new ArrayList<>();
        for (int i = 0; i < lapMesgs.size(); i++) {
            LapMesg lap = lapMesgs.get(i);

            Float lapSpeed = firstNonNull(lap.getEnhancedAvgSpeed(), lap.getAvgSpeed());
            Float lapMaxSpeedRaw = firstNonNull(lap.getEnhancedMaxSpeed(), lap.getMaxSpeed());

            BigDecimal lapDescent = lap.getTotalDescent() != null
                    ? BigDecimal.valueOf(lap.getTotalDescent()).setScale(2, RoundingMode.HALF_UP)
                    : null;

            String trigger = mapLapTrigger(lap.getLapTrigger());

            laps.add(new ParsedLap(
                    i,
                    lap.getStartTime() != null ? fitTimestampToInstant(lap.getStartTime()) : null,
                    roundSecondsOrNull(lap.getTotalElapsedTime()),
                    scaledDecimal(lap.getTotalDistance(), 2),
                    toInteger(lap.getAvgHeartRate()),
                    toInteger(lap.getMaxHeartRate()),
                    lap.getAvgPower(),
                    lap.getMaxPower(),
                    lap.getNormalizedPower(),
                    lapAverageCadence(sport, lap),
                    deriveAveragePace(sport, lapSpeed),
                    scaledDecimal(lapMaxSpeedRaw, 4),
                    lap.getTotalAscent() != null
                            ? BigDecimal.valueOf(lap.getTotalAscent()).setScale(2, RoundingMode.HALF_UP)
                            : null,
                    lapDescent,
                    trigger
            ));
        }
        return laps;
    }

    // ── Streams ────────────────────────────────────────────────────────────────

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
        List<Float>   grade       = new ArrayList<>();

        boolean hasHr = false, hasPower = false, hasCadence = false, hasSpeed = false;
        boolean hasAlt = false, hasGps = false, hasDist = false, hasTemp = false, hasGrade = false;

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

            Float recordSpeed = firstNonNull(r.getEnhancedSpeed(), r.getSpeed());
            if (recordSpeed != null) { speed.add(recordSpeed); hasSpeed = true; }
            else speed.add(null);

            Float recordAltitude = firstNonNull(r.getEnhancedAltitude(), r.getAltitude());
            if (recordAltitude != null) { altitude.add(recordAltitude); hasAlt = true; }
            else altitude.add(null);

            if (r.getPositionLat() != null && r.getPositionLong() != null) {
                latitude.add(semicircleToDegree(r.getPositionLat()));
                longitude.add(semicircleToDegree(r.getPositionLong()));
                hasGps = true;
            } else {
                latitude.add(null);
                longitude.add(null);
            }

            if (r.getDistance() != null) { distance.add(r.getDistance()); hasDist = true; }
            else distance.add(null);

            if (r.getTemperature() != null) { temperature.add(r.getTemperature().shortValue()); hasTemp = true; }
            else temperature.add(null);

            if (r.getGrade() != null) { grade.add(r.getGrade()); hasGrade = true; }
            else grade.add(null);
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
                hasTemp    ? temperature : null,
                hasGrade   ? grade       : null
        );
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────

    private static Instant fitTimestampToInstant(DateTime dt) {
        if (dt == null) return Instant.EPOCH;
        return dt.getDate().toInstant();
    }

    private static int roundSeconds(Float seconds) {
        return seconds != null ? Math.round(seconds) : 0;
    }

    private static Integer roundSecondsOrNull(Float seconds) {
        return seconds != null ? Math.round(seconds) : null;
    }

    private static Integer sessionAverageCadence(String sport, SessionMesg session) {
        if ("running".equals(sport) && session.getAvgRunningCadence() != null) {
            return session.getAvgRunningCadence().intValue();
        }
        return toInteger(session.getAvgCadence());
    }

    private static Integer lapAverageCadence(String sport, LapMesg lap) {
        if ("running".equals(sport) && lap.getAvgRunningCadence() != null) {
            return lap.getAvgRunningCadence().intValue();
        }
        return toInteger(lap.getAvgCadence());
    }

    private static BigDecimal deriveAveragePace(String sport, Float speedMetersPerSecond) {
        if (!"running".equals(sport) || speedMetersPerSecond == null || speedMetersPerSecond <= 0f) {
            return null;
        }
        return BigDecimal.valueOf(1000d / speedMetersPerSecond).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal scaledDecimal(Float value, int scale) {
        return value != null
                ? BigDecimal.valueOf(value.doubleValue()).setScale(scale, RoundingMode.HALF_UP)
                : null;
    }

    private static Integer toInteger(Short value) {
        return value != null ? value.intValue() : null;
    }

    private static double semicircleToDegree(int semicircle) {
        return semicircle * SEMICIRCLE_TO_DEGREE;
    }

    private static double[] firstRecordedCoordinates(List<RecordMesg> records) {
        for (RecordMesg r : records) {
            if (r.getPositionLat() != null && r.getPositionLong() != null) {
                return new double[] {
                        semicircleToDegree(r.getPositionLat()),
                        semicircleToDegree(r.getPositionLong())
                };
            }
        }
        return new double[] {Double.NaN, Double.NaN};
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) return value;
        }
        return null;
    }

    private static String mapSport(Sport sport) {
        if (sport == null) return "other";
        return switch (sport) {
            case CYCLING           -> "cycling";
            case RUNNING           -> "running";
            case SWIMMING          -> "swimming";
            case HIKING            -> "hiking";
            case WALKING           -> "walking";
            case MULTISPORT        -> "multisport";
            case ROWING            -> "rowing";
            case CROSS_COUNTRY_SKIING -> "cross_country_skiing";
            case ALPINE_SKIING     -> "alpine_skiing";
            case SNOWBOARDING      -> "snowboarding";
            case PADDLING          -> "paddling";
            default                -> "other";
        };
    }

    private static String mapSubSport(SubSport subSport) {
        if (subSport == null) return null;
        return switch (subSport) {
            case ROAD             -> "road";
            case MOUNTAIN         -> "mountain";
            case TRACK            -> "track";
            case TRAIL            -> "trail";
            case VIRTUAL_ACTIVITY -> "virtual";
            case INDOOR_CYCLING   -> "indoor";
            case TREADMILL        -> "treadmill";
            default               -> null;
        };
    }

    private static String mapSwimStroke(SwimStroke stroke) {
        if (stroke == null) return null;
        return switch (stroke) {
            case FREESTYLE   -> "freestyle";
            case BACKSTROKE  -> "backstroke";
            case BREASTSTROKE -> "breaststroke";
            case BUTTERFLY   -> "butterfly";
            case DRILL       -> "drill";
            case MIXED       -> "mixed";
            default          -> null;
        };
    }

    private static String mapLapTrigger(LapTrigger trigger) {
        if (trigger == null) return null;
        return switch (trigger) {
            case MANUAL              -> "manual";
            case DISTANCE            -> "distance";
            case TIME                -> "time";
            case SESSION_END         -> "session_end";
            case FITNESS_EQUIPMENT   -> "fitness_equipment";
            default                  -> "auto";
        };
    }

    private static String buildName(String sport) {
        return sport.substring(0, 1).toUpperCase() + sport.substring(1) + " Activity";
    }

    private static class SessionHolder {
        SessionMesg mesg;
        void set(SessionMesg m) { this.mesg = m; }
    }
}
