package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.FileParseException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses Garmin TCX activity files using Jackson XML.
 */
@Component
public class TcxParser {

    private final XmlMapper xmlMapper;

    public TcxParser() {
        this.xmlMapper = new XmlMapper();
        this.xmlMapper.configure(
                com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public ParsedActivity parse(byte[] fileBytes) {
        TcxRoot root;
        try {
            root = xmlMapper.readValue(fileBytes, TcxRoot.class);
        } catch (Exception e) {
            throw new FileParseException("TCX", "XML parse error: " + e.getMessage(), e);
        }

        if (root == null || root.activities == null || root.activities.activityList == null
                || root.activities.activityList.isEmpty()) {
            throw new FileParseException("TCX", "No Activity element found");
        }

        TcxActivity activity = root.activities.activityList.get(0);
        String sport = mapSport(activity.sport);

        if (activity.lapList == null || activity.lapList.isEmpty()) {
            throw new FileParseException("TCX", "Activity has no Lap elements");
        }

        Instant startedAt = parseInstantOrNull(activity.id);
        if (startedAt == null) {
            startedAt = parseInstantOrNull(activity.lapList.get(0).startTime);
        }
        if (startedAt == null) startedAt = Instant.EPOCH;

        double totalDurationSeconds = 0d;
        double totalDistanceMeters = 0d;
        int totalCalories = 0;

        long weightedHrSum = 0L;
        long weightedHrWeight = 0L;
        long weightedCadenceSum = 0L;
        long weightedCadenceWeight = 0L;
        long weightedPowerSum = 0L;
        long weightedPowerWeight = 0L;
        Integer lapMaxHeartRate = null;
        Integer lapMaxPower = null;

        List<ParsedLap> laps = new ArrayList<>();
        List<Trackpoint> allPoints = new ArrayList<>();

        for (int i = 0; i < activity.lapList.size(); i++) {
            TcxLap lap = activity.lapList.get(i);
            int lapDurationSeconds = roundDuration(lap.totalTimeSeconds);
            int lapWeight = Math.max(1, lapDurationSeconds);

            totalDurationSeconds += lap.totalTimeSeconds != null ? lap.totalTimeSeconds : 0d;
            totalDistanceMeters += lap.distanceMeters != null ? lap.distanceMeters : 0d;
            totalCalories += lap.calories != null ? lap.calories : 0;

            Integer avgHeartRate = lap.averageHeartRateBpm != null ? lap.averageHeartRateBpm.value : null;
            Integer maxHeartRate = lap.maximumHeartRateBpm != null ? lap.maximumHeartRateBpm.value : null;
            if (avgHeartRate != null) {
                weightedHrSum += (long) avgHeartRate * lapWeight;
                weightedHrWeight += lapWeight;
            }
            lapMaxHeartRate = maxNullable(lapMaxHeartRate, maxHeartRate);

            Integer avgCadence = firstNonNull(
                    lap.averageBikeCadence,
                    lap.averageRunCadence);
            if (avgCadence != null) {
                weightedCadenceSum += (long) avgCadence * lapWeight;
                weightedCadenceWeight += lapWeight;
            }

            Integer avgPower = null;
            Integer maxPower = null;
            if (lap.extensions != null && lap.extensions.lx != null) {
                avgPower = lap.extensions.lx.avgWatts;
                maxPower = lap.extensions.lx.maxWatts;
            }
            if (avgPower != null) {
                weightedPowerSum += (long) avgPower * lapWeight;
                weightedPowerWeight += lapWeight;
            }
            lapMaxPower = maxNullable(lapMaxPower, maxPower);

            laps.add(new ParsedLap(
                    i,
                    parseInstantOrNull(lap.startTime),
                    lapDurationSeconds > 0 ? lapDurationSeconds : null,
                    lap.distanceMeters != null
                            ? BigDecimal.valueOf(lap.distanceMeters).setScale(2, RoundingMode.HALF_UP)
                            : null,
                    avgHeartRate,
                    maxHeartRate,
                    avgPower,
                    maxPower,
                    avgCadence,
                    deriveAveragePace(sport, lap.distanceMeters, lap.totalTimeSeconds),
                    null
            ));

            if (lap.track != null && lap.track.trackpoints != null) {
                allPoints.addAll(lap.track.trackpoints);
            }
        }

        TrackpointSummary trackpointSummary = summarizeTrackpoints(allPoints);
        ParsedStreams streams = buildStreams(allPoints, startedAt);

        Double effectiveDistanceMeters = totalDistanceMeters > 0d
                ? totalDistanceMeters
                : trackpointSummary.lastDistanceMeters;
        BigDecimal distance = effectiveDistanceMeters != null && effectiveDistanceMeters > 0d
                ? BigDecimal.valueOf(effectiveDistanceMeters).setScale(2, RoundingMode.HALF_UP)
                : null;

        BigDecimal avgSpeed = deriveAverageSpeed(effectiveDistanceMeters, totalDurationSeconds);
        Integer avgHeartRate = firstNonNull(
                trackpointSummary.avgHeartRate,
                weightedAverage(weightedHrSum, weightedHrWeight));
        Integer maxHeartRate = maxNullable(trackpointSummary.maxHeartRate, lapMaxHeartRate);
        Integer avgCadence = firstNonNull(
                trackpointSummary.avgCadence,
                weightedAverage(weightedCadenceSum, weightedCadenceWeight));
        Integer avgPower = firstNonNull(
                trackpointSummary.avgPower,
                weightedAverage(weightedPowerSum, weightedPowerWeight));
        Integer maxPower = maxNullable(trackpointSummary.maxPower, lapMaxPower);

        return new ParsedActivity(
                sport,
                null,
                buildName(sport),
                startedAt,
                roundDuration(totalDurationSeconds),
                null,
                distance,
                trackpointSummary.elevationGainMeters,
                totalCalories > 0 ? totalCalories : null,
                avgHeartRate,
                maxHeartRate,
                avgPower,
                maxPower,
                null,
                null,
                null,
                avgCadence,
                avgSpeed,
                trackpointSummary.startLat,
                trackpointSummary.startLng,
                laps,
                streams
        );
    }

    private ParsedStreams buildStreams(List<Trackpoint> points, Instant activityStart) {
        if (points.isEmpty()) return ParsedStreams.empty();

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
        List<Short> temperature = new ArrayList<>(); // BUG-12 fix: was missing
        List<Float> grade = new ArrayList<>();

        boolean hasHr = false;
        boolean hasPower = false;
        boolean hasCadence = false;
        boolean hasSpeed = false;
        boolean hasAltitude = false;
        boolean hasGps = false;
        boolean hasDistance = false;
        boolean hasTemp = false; // BUG-12 fix
        boolean hasGrade = false;

        Instant previousTime = null;
        Double previousDistanceMeters = null;
        Double previousAltitudeMeters = null;

        for (Trackpoint point : points) {
            Instant timestamp = parseInstantOrNull(point.time);
            if (timestamp == null) continue;

            // BUG-14 fix: skip duplicate timestamps to avoid division-by-zero in speed/grade calc
            if (timestamp.equals(previousTime)) continue;

            int elapsed = (int) (timestamp.getEpochSecond() - startEpoch);
            timestamps.add(elapsed);

            if (point.heartRateBpm != null && point.heartRateBpm.value != null) {
                heartRate.add(point.heartRateBpm.value.shortValue());
                hasHr = true;
            } else {
                heartRate.add(null);
            }

            Integer pointPower = null;
            Integer pointCadence = null;
            Double pointSpeed = null;
            if (point.extensions != null && point.extensions.tpx != null) {
                pointPower = point.extensions.tpx.watts;
                pointCadence = firstNonNull(
                        point.extensions.tpx.cadence,
                        point.extensions.tpx.runCadence);
                pointSpeed = point.extensions.tpx.speed;
            }

            if (pointPower != null) {
                power.add(pointPower.shortValue());
                hasPower = true;
            } else {
                power.add(null);
            }

            if (pointCadence != null) {
                cadence.add(pointCadence.shortValue());
                hasCadence = true;
            } else {
                cadence.add(null);
            }

            // BUG-12 fix: read temperature from TPX extension (Garmin uses "Temp" or "atemp")
            Integer pointTemp = null;
            if (point.extensions != null && point.extensions.tpx != null) {
                pointTemp = point.extensions.tpx.temp;
            }
            if (pointTemp != null) {
                temperature.add(pointTemp.shortValue());
                hasTemp = true;
            } else {
                temperature.add(null);
            }

            Double altitudeMeters = point.altitudeMeters;
            if (altitudeMeters != null) {
                altitude.add(altitudeMeters.floatValue());
                hasAltitude = true;
            } else {
                altitude.add(null);
            }

            if (point.position != null) {
                latitude.add(point.position.latitudeDegrees);
                longitude.add(point.position.longitudeDegrees);
                hasGps = true;
            } else {
                latitude.add(null);
                longitude.add(null);
            }

            Double pointDistanceMeters = point.distanceMeters;
            if (pointDistanceMeters != null) {
                distance.add(pointDistanceMeters.floatValue());
                hasDistance = true;
            } else {
                distance.add(null);
            }

            Float derivedSpeed = null;
            if (pointSpeed != null) {
                derivedSpeed = pointSpeed.floatValue();
            } else if (previousTime != null
                    && previousDistanceMeters != null
                    && pointDistanceMeters != null) {
                long deltaSeconds = timestamp.getEpochSecond() - previousTime.getEpochSecond();
                double deltaDistanceMeters = pointDistanceMeters - previousDistanceMeters;
                if (deltaSeconds > 0 && deltaDistanceMeters >= 0d) {
                    derivedSpeed = (float) (deltaDistanceMeters / deltaSeconds);
                }
            }
            if (derivedSpeed != null) {
                speed.add(derivedSpeed);
                hasSpeed = true;
            } else {
                speed.add(null);
            }

            Float pointGrade = null;
            if (previousDistanceMeters != null && pointDistanceMeters != null
                    && previousAltitudeMeters != null && altitudeMeters != null) {
                double deltaDistanceMeters = pointDistanceMeters - previousDistanceMeters;
                if (deltaDistanceMeters > 0d) {
                    pointGrade = (float) (((altitudeMeters - previousAltitudeMeters) / deltaDistanceMeters) * 100d);
                }
            }
            if (pointGrade != null) {
                grade.add(pointGrade);
                hasGrade = true;
            } else {
                grade.add(null);
            }

            previousTime = timestamp;
            previousDistanceMeters = pointDistanceMeters;
            previousAltitudeMeters = altitudeMeters;
        }

        return new ParsedStreams(
                timestamps,
                hasHr ? heartRate : null,
                hasPower ? power : null,
                hasCadence ? cadence : null,
                hasSpeed ? speed : null,
                hasAltitude ? altitude : null,
                hasGps ? latitude : null,
                hasGps ? longitude : null,
                hasDistance ? distance : null,
                hasTemp ? temperature : null, // BUG-12 fix: was always null
                hasGrade ? grade : null
        );
    }

    private TrackpointSummary summarizeTrackpoints(List<Trackpoint> points) {
        if (points.isEmpty()) {
            return TrackpointSummary.empty();
        }

        long hrSum = 0L;
        long hrCount = 0L;
        Integer maxHeartRate = null;
        long powerSum = 0L;
        long powerCount = 0L;
        Integer maxPower = null;
        long cadenceSum = 0L;
        long cadenceCount = 0L;
        double elevationGain = 0d;
        Double previousAltitudeMeters = null;
        Double startLat = null;
        Double startLng = null;
        Double lastDistanceMeters = null;

        for (Trackpoint point : points) {
            if (startLat == null && point.position != null) {
                startLat = point.position.latitudeDegrees;
                startLng = point.position.longitudeDegrees;
            }

            if (point.distanceMeters != null) {
                lastDistanceMeters = point.distanceMeters;
            }

            if (point.heartRateBpm != null && point.heartRateBpm.value != null) {
                int hr = point.heartRateBpm.value;
                hrSum += hr;
                hrCount++;
                maxHeartRate = maxNullable(maxHeartRate, hr);
            }

            if (point.extensions != null && point.extensions.tpx != null) {
                if (point.extensions.tpx.watts != null) {
                    int watts = point.extensions.tpx.watts;
                    powerSum += watts;
                    powerCount++;
                    maxPower = maxNullable(maxPower, watts);
                }

                Integer pointCadence = firstNonNull(
                        point.extensions.tpx.cadence,
                        point.extensions.tpx.runCadence);
                if (pointCadence != null) {
                    cadenceSum += pointCadence;
                    cadenceCount++;
                }
            }

            if (point.altitudeMeters != null) {
                if (previousAltitudeMeters != null && point.altitudeMeters > previousAltitudeMeters) {
                    elevationGain += point.altitudeMeters - previousAltitudeMeters;
                }
                previousAltitudeMeters = point.altitudeMeters;
            }
        }

        return new TrackpointSummary(
                hrCount > 0 ? (int) Math.round((double) hrSum / hrCount) : null,
                maxHeartRate,
                powerCount > 0 ? (int) Math.round((double) powerSum / powerCount) : null,
                maxPower,
                cadenceCount > 0 ? (int) Math.round((double) cadenceSum / cadenceCount) : null,
                elevationGain > 0d
                        ? BigDecimal.valueOf(elevationGain).setScale(2, RoundingMode.HALF_UP)
                        : null,
                startLat,
                startLng,
                lastDistanceMeters
        );
    }

    private static Instant parseInstantOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private static String mapSport(String tcxSport) {
        if (tcxSport == null) return "other";
        return switch (tcxSport.toLowerCase()) {
            case "biking" -> "cycling";
            case "running" -> "running";
            case "swimming" -> "swimming";
            case "other" -> "other";
            default -> tcxSport.toLowerCase();
        };
    }

    private static String buildName(String sport) {
        return sport.substring(0, 1).toUpperCase() + sport.substring(1) + " Activity";
    }

    private static int roundDuration(Double seconds) {
        return seconds != null ? (int) Math.round(seconds) : 0;
    }

    private static BigDecimal deriveAverageSpeed(Double totalDistanceMeters, Double totalDurationSeconds) {
        if (totalDistanceMeters == null || totalDurationSeconds == null || totalDurationSeconds <= 0d) {
            return null;
        }
        return BigDecimal.valueOf(totalDistanceMeters / totalDurationSeconds)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private static BigDecimal deriveAveragePace(String sport, Double distanceMeters, Double durationSeconds) {
        if (!"running".equals(sport) || distanceMeters == null || durationSeconds == null
                || distanceMeters <= 0d || durationSeconds <= 0d) {
            return null;
        }
        return BigDecimal.valueOf((durationSeconds / distanceMeters) * 1000d)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static Integer weightedAverage(long weightedSum, long totalWeight) {
        if (totalWeight <= 0L) return null;
        return (int) Math.round((double) weightedSum / totalWeight);
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) return value;
        }
        return null;
    }

    private static Integer maxNullable(Integer a, Integer b) {
        if (a == null) return b;
        if (b == null) return a;
        return Math.max(a, b);
    }

    @JacksonXmlRootElement(localName = "TrainingCenterDatabase")
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class TcxRoot {
        @JacksonXmlProperty(localName = "Activities")
        Activities activities;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class Activities {
        @JacksonXmlProperty(localName = "Activity")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<TcxActivity> activityList;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class TcxActivity {
        @JacksonXmlProperty(isAttribute = true, localName = "Sport")
        String sport;

        @JacksonXmlProperty(localName = "Id")
        String id;

        @JacksonXmlProperty(localName = "Lap")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<TcxLap> lapList;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class TcxLap {
        @JacksonXmlProperty(isAttribute = true, localName = "StartTime")
        String startTime;

        @JacksonXmlProperty(localName = "TotalTimeSeconds")
        Double totalTimeSeconds;

        @JacksonXmlProperty(localName = "DistanceMeters")
        Double distanceMeters;

        @JacksonXmlProperty(localName = "Calories")
        Integer calories;

        @JacksonXmlProperty(localName = "AverageHeartRateBpm")
        HrValue averageHeartRateBpm;

        @JacksonXmlProperty(localName = "MaximumHeartRateBpm")
        HrValue maximumHeartRateBpm;

        @JacksonXmlProperty(localName = "AverageBikeCadence")
        Integer averageBikeCadence;

        @JacksonXmlProperty(localName = "AverageRunCadence")
        Integer averageRunCadence;

        @JacksonXmlProperty(localName = "Extensions")
        LapExtensions extensions;

        @JacksonXmlProperty(localName = "Track")
        Track track;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class HrValue {
        @JacksonXmlProperty(localName = "Value")
        Integer value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class LapExtensions {
        @JacksonXmlProperty(localName = "LX")
        LX lx;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class LX {
        @JacksonXmlProperty(localName = "AvgWatts")
        Integer avgWatts;

        @JacksonXmlProperty(localName = "MaxWatts")
        Integer maxWatts;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class Track {
        @JacksonXmlProperty(localName = "Trackpoint")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<Trackpoint> trackpoints;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class Trackpoint {
        @JacksonXmlProperty(localName = "Time")
        String time;

        @JacksonXmlProperty(localName = "Position")
        Position position;

        @JacksonXmlProperty(localName = "AltitudeMeters")
        Double altitudeMeters;

        @JacksonXmlProperty(localName = "DistanceMeters")
        Double distanceMeters;

        @JacksonXmlProperty(localName = "HeartRateBpm")
        HrValue heartRateBpm;

        @JacksonXmlProperty(localName = "Extensions")
        TpExtensions extensions;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class Position {
        @JacksonXmlProperty(localName = "LatitudeDegrees")
        Double latitudeDegrees;

        @JacksonXmlProperty(localName = "LongitudeDegrees")
        Double longitudeDegrees;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class TpExtensions {
        @JacksonXmlProperty(localName = "TPX")
        TPX tpx;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class TPX {
        @JacksonXmlProperty(localName = "Watts")
        Integer watts;

        @JacksonXmlProperty(localName = "Cadence")
        Integer cadence;

        @JacksonXmlProperty(localName = "RunCadence")
        Integer runCadence;

        @JacksonXmlProperty(localName = "Speed")
        Double speed;

        // BUG-12 fix: Garmin TPX uses "Temp" for temperature in TCX
        @JacksonXmlProperty(localName = "Temp")
        Integer temp;
    }

    private record TrackpointSummary(
            Integer avgHeartRate,
            Integer maxHeartRate,
            Integer avgPower,
            Integer maxPower,
            Integer avgCadence,
            BigDecimal elevationGainMeters,
            Double startLat,
            Double startLng,
            Double lastDistanceMeters
    ) {
        private static TrackpointSummary empty() {
            return new TrackpointSummary(null, null, null, null, null, null, null, null, null);
        }
    }
}
