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
import com.garmin.fit.MesgBroadcaster;
import com.garmin.fit.RecordMesg;
import com.garmin.fit.RecordMesgListener;
import com.garmin.fit.SessionMesg;
import com.garmin.fit.SessionMesgListener;
import com.garmin.fit.Sport;
import com.garmin.fit.SubSport;
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
        String sport = mapSport(session.getSport());
        String subSport = mapSubSport(session.getSubSport());
        String name = buildName(sport);

        Instant startedAt = fitTimestampToInstant(session.getStartTime());
        int durationSeconds = roundSeconds(session.getTotalElapsedTime());
        Integer movingTime = firstNonNull(
                roundSecondsOrNull(session.getTotalMovingTime()),
                roundSecondsOrNull(session.getTotalTimerTime()));

        BigDecimal distanceMeters = scaledDecimal(session.getTotalDistance(), 2);
        BigDecimal elevationGain = session.getTotalAscent() != null
                ? BigDecimal.valueOf(session.getTotalAscent()).setScale(2, RoundingMode.HALF_UP)
                : null;
        Integer calories = session.getTotalCalories();
        Integer avgHr = toInteger(session.getAvgHeartRate());
        Integer maxHr = toInteger(session.getMaxHeartRate());
        Integer avgPower = session.getAvgPower();
        Integer maxPower = session.getMaxPower();
        Integer normalizedPower = session.getNormalizedPower();
        BigDecimal intensityFactor = scaledDecimal(session.getIntensityFactor(), 3);
        BigDecimal tss = scaledDecimal(session.getTrainingStressScore(), 2);
        Integer avgCadence = sessionAverageCadence(sport, session);
        BigDecimal avgSpeed = scaledDecimal(
                firstNonNull(session.getEnhancedAvgSpeed(), session.getAvgSpeed()), 4);

        Double startLat = session.getStartPositionLat() != null
                ? semicircleToDegree(session.getStartPositionLat())
                : null;
        Double startLng = session.getStartPositionLong() != null
                ? semicircleToDegree(session.getStartPositionLong())
                : null;
        if (startLat == null || startLng == null) {
            double[] fallbackStart = firstRecordedCoordinates(records);
            if (startLat == null && !Double.isNaN(fallbackStart[0])) startLat = fallbackStart[0];
            if (startLng == null && !Double.isNaN(fallbackStart[1])) startLng = fallbackStart[1];
        }

        List<ParsedLap> laps = buildLaps(lapMesgs, sport);
        ParsedStreams streams = buildStreams(records, startedAt);

        return new ParsedActivity(
                sport,
                subSport,
                name,
                startedAt,
                durationSeconds,
                movingTime,
                distanceMeters,
                elevationGain,
                calories,
                avgHr,
                maxHr,
                avgPower,
                maxPower,
                normalizedPower,
                intensityFactor,
                tss,
                avgCadence,
                avgSpeed,
                startLat,
                startLng,
                laps,
                streams
        );
    }

    private List<ParsedLap> buildLaps(List<LapMesg> lapMesgs, String sport) {
        List<ParsedLap> laps = new ArrayList<>();
        for (int i = 0; i < lapMesgs.size(); i++) {
            LapMesg lap = lapMesgs.get(i);
            Float lapSpeed = firstNonNull(lap.getEnhancedAvgSpeed(), lap.getAvgSpeed());
            laps.add(new ParsedLap(
                    i,
                    lap.getStartTime() != null ? fitTimestampToInstant(lap.getStartTime()) : null,
                    roundSecondsOrNull(lap.getTotalElapsedTime()),
                    scaledDecimal(lap.getTotalDistance(), 2),
                    toInteger(lap.getAvgHeartRate()),
                    toInteger(lap.getMaxHeartRate()),
                    lap.getAvgPower(),
                    lap.getMaxPower(),
                    lapAverageCadence(sport, lap),
                    deriveAveragePace(sport, lapSpeed),
                    lap.getTotalAscent() != null
                            ? BigDecimal.valueOf(lap.getTotalAscent()).setScale(2, RoundingMode.HALF_UP)
                            : null
            ));
        }
        return laps;
    }

    private ParsedStreams buildStreams(List<RecordMesg> records, Instant activityStart) {
        if (records.isEmpty()) return ParsedStreams.empty();

        long startEpoch = activityStart.getEpochSecond();

        List<Integer> timestamps = new ArrayList<>();
        List<Short> heartRate = new ArrayList<>();
        List<Short> power = new ArrayList<>();
        List<Short> cadence = new ArrayList<>();
        List<Float> speed = new ArrayList<>();
        List<Float> altitude = new ArrayList<>();
        List<Double> latitude = new ArrayList<>();
        List<Double> longitude = new ArrayList<>();
        List<Float> distance = new ArrayList<>();
        List<Short> temperature = new ArrayList<>();
        List<Float> grade = new ArrayList<>();

        boolean hasHr = false;
        boolean hasPower = false;
        boolean hasCadence = false;
        boolean hasSpeed = false;
        boolean hasAlt = false;
        boolean hasGps = false;
        boolean hasDist = false;
        boolean hasTemp = false;
        boolean hasGrade = false;

        for (RecordMesg r : records) {
            if (r.getTimestamp() == null) continue;

            int elapsed = (int) (r.getTimestamp().getDate().toInstant().getEpochSecond() - startEpoch);
            timestamps.add(elapsed);

            if (r.getHeartRate() != null) {
                heartRate.add(r.getHeartRate().shortValue());
                hasHr = true;
            } else {
                heartRate.add(null);
            }

            if (r.getPower() != null) {
                power.add(r.getPower().shortValue());
                hasPower = true;
            } else {
                power.add(null);
            }

            if (r.getCadence() != null) {
                cadence.add(r.getCadence().shortValue());
                hasCadence = true;
            } else {
                cadence.add(null);
            }

            Float recordSpeed = firstNonNull(r.getEnhancedSpeed(), r.getSpeed());
            if (recordSpeed != null) {
                speed.add(recordSpeed);
                hasSpeed = true;
            } else {
                speed.add(null);
            }

            Float recordAltitude = firstNonNull(r.getEnhancedAltitude(), r.getAltitude());
            if (recordAltitude != null) {
                altitude.add(recordAltitude);
                hasAlt = true;
            } else {
                altitude.add(null);
            }

            if (r.getPositionLat() != null && r.getPositionLong() != null) {
                latitude.add(semicircleToDegree(r.getPositionLat()));
                longitude.add(semicircleToDegree(r.getPositionLong()));
                hasGps = true;
            } else {
                latitude.add(null);
                longitude.add(null);
            }

            if (r.getDistance() != null) {
                distance.add(r.getDistance());
                hasDist = true;
            } else {
                distance.add(null);
            }

            if (r.getTemperature() != null) {
                temperature.add(r.getTemperature().shortValue());
                hasTemp = true;
            } else {
                temperature.add(null);
            }

            if (r.getGrade() != null) {
                grade.add(r.getGrade());
                hasGrade = true;
            } else {
                grade.add(null);
            }
        }

        return new ParsedStreams(
                timestamps,
                hasHr ? heartRate : null,
                hasPower ? power : null,
                hasCadence ? cadence : null,
                hasSpeed ? speed : null,
                hasAlt ? altitude : null,
                hasGps ? latitude : null,
                hasGps ? longitude : null,
                hasDist ? distance : null,
                hasTemp ? temperature : null,
                hasGrade ? grade : null
        );
    }

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

    /**
     * Maps Garmin FIT {@link Sport} enum to CoachFit sport strings.
     * Unknown/unmapped sports fall back to "other".
     */
    private static String mapSport(Sport sport) {
        if (sport == null) return "other";
        return switch (sport) {
            case CYCLING -> "cycling";
            case RUNNING -> "running";
            case SWIMMING -> "swimming";
            case HIKING -> "hiking";
            case WALKING -> "walking";
            case MULTISPORT -> "multisport";
            case ROWING -> "rowing";
            case CROSS_COUNTRY_SKIING -> "cross_country_skiing";
            case ALPINE_SKIING -> "alpine_skiing";
            case SNOWBOARDING -> "snowboarding";
            case PADDLING -> "paddling";
            default -> "other";
        };
    }

    private static String mapSubSport(SubSport subSport) {
        if (subSport == null) return null;
        return switch (subSport) {
            case ROAD -> "road";
            case MOUNTAIN -> "mountain";
            case TRACK -> "track";
            case TRAIL -> "trail";
            case VIRTUAL_ACTIVITY -> "virtual";
            case INDOOR_CYCLING -> "indoor";
            case TREADMILL -> "treadmill";
            default -> null;
        };
    }

    private static String buildName(String sport) {
        return sport.substring(0, 1).toUpperCase() + sport.substring(1) + " Activity";
    }

    private static class SessionHolder {
        SessionMesg mesg;

        void set(SessionMesg m) {
            this.mesg = m;
        }
    }
}
