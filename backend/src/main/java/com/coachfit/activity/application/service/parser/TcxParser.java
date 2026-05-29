package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.FileParseException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
 * Parses Garmin TCX (Training Center XML) files using Jackson XML.
 *
 * <h3>TCX hierarchy mapped</h3>
 * <pre>
 * TrainingCenterDatabase
 *   Activities
 *     Activity (sport attribute)
 *       Id (timestamp)
 *       Lap[]
 *         TotalTimeSeconds
 *         DistanceMeters
 *         MaximumHeartRateBpm / AverageHeartRateBpm
 *         Calories
 *         AverageRunCadence / AverageBikeCadence
 *         MaxBikeCadence
 *         Extensions / LX / AvgWatts / MaxWatts
 *         Track
 *           Trackpoint[]
 *             Time
 *             Position (LatitudeDegrees / LongitudeDegrees)
 *             AltitudeMeters
 *             DistanceMeters
 *             HeartRateBpm / Value
 *             Extensions / TPX / Watts / Cadence
 * </pre>
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

        // Derive activity start time from the Id element or first lap startTime attribute
        Instant startedAt = parseInstantOrNull(activity.id);
        if (startedAt == null && !activity.lapList.isEmpty()) {
            startedAt = parseInstantOrNull(activity.lapList.get(0).startTime);
        }
        if (startedAt == null) startedAt = Instant.EPOCH;

        // Aggregate metrics across all laps
        double totalDuration = 0;
        double totalDistance = 0;
        int totalCalories    = 0;
        long hrSum = 0, hrCount = 0;
        long cadenceSum = 0, cadenceCount = 0;

        List<ParsedLap>   laps    = new ArrayList<>();
        List<Trackpoint>  allPoints = new ArrayList<>();

        for (int i = 0; i < activity.lapList.size(); i++) {
            TcxLap lap  = activity.lapList.get(i);
            totalDuration += lap.totalTimeSeconds != null ? lap.totalTimeSeconds : 0;
            totalDistance += lap.distanceMeters != null ? lap.distanceMeters : 0;
            totalCalories += lap.calories != null ? lap.calories : 0;

            Integer avgHrLap = null, maxHrLap = null;
            if (lap.averageHeartRateBpm != null) avgHrLap = lap.averageHeartRateBpm.value;
            if (lap.maximumHeartRateBpm != null) maxHrLap = lap.maximumHeartRateBpm.value;
            if (avgHrLap != null) { hrSum += avgHrLap; hrCount++; }

            Integer avgCad = lap.averageBikeCadence != null ? lap.averageBikeCadence :
                             lap.averageRunCadence != null  ? lap.averageRunCadence : null;
            if (avgCad != null) { cadenceSum += avgCad; cadenceCount++; }

            Integer avgPower = null, maxPower = null;
            if (lap.extensions != null && lap.extensions.lx != null) {
                avgPower = lap.extensions.lx.avgWatts;
                maxPower = lap.extensions.lx.maxWatts;
            }

            Instant lapStart = parseInstantOrNull(lap.startTime);

            laps.add(new ParsedLap(
                    i,
                    lapStart,
                    lap.totalTimeSeconds != null ? lap.totalTimeSeconds.intValue() : null,
                    lap.distanceMeters != null
                            ? BigDecimal.valueOf(lap.distanceMeters).setScale(2, RoundingMode.HALF_UP) : null,
                    avgHrLap, maxHrLap, avgPower, maxPower, avgCad,
                    null, null
            ));

            if (lap.track != null && lap.track.trackpoints != null) {
                allPoints.addAll(lap.track.trackpoints);
            }
        }

        Integer avgHr    = hrCount      > 0 ? (int)(hrSum / hrCount)      : null;
        Integer avgCad   = cadenceCount > 0 ? (int)(cadenceSum / cadenceCount) : null;

        Double startLat = null, startLng = null;
        for (Trackpoint tp : allPoints) {
            if (tp.position != null) {
                startLat = tp.position.latitudeDegrees;
                startLng = tp.position.longitudeDegrees;
                break;
            }
        }

        ParsedStreams streams = buildStreams(allPoints, startedAt);

        return new ParsedActivity(
                sport, null,
                sport.substring(0, 1).toUpperCase() + sport.substring(1) + " Activity",
                startedAt, (int) totalDuration, null,
                totalDistance > 0
                        ? BigDecimal.valueOf(totalDistance).setScale(2, RoundingMode.HALF_UP) : null,
                null,
                totalCalories > 0 ? totalCalories : null,
                avgHr, null, null, null, avgCad, null,
                startLat, startLng, laps, streams
        );
    }

    private ParsedStreams buildStreams(List<Trackpoint> points, Instant activityStart) {
        if (points.isEmpty()) return ParsedStreams.empty();

        long startEpoch = activityStart.getEpochSecond();

        List<Integer> timestamps = new ArrayList<>();
        List<Short>   heartRate  = new ArrayList<>();
        List<Short>   power      = new ArrayList<>();
        List<Short>   cadence    = new ArrayList<>();
        List<Float>   altitude   = new ArrayList<>();
        List<Double>  latitude   = new ArrayList<>();
        List<Double>  longitude  = new ArrayList<>();
        List<Float>   distance   = new ArrayList<>();

        boolean hasHr = false, hasPower = false, hasCad = false;
        boolean hasAlt = false, hasGps = false, hasDist = false;

        for (Trackpoint tp : points) {
            if (tp.time == null) continue;
            Instant tpInstant = parseInstantOrNull(tp.time);
            if (tpInstant == null) continue;

            int elapsed = (int)(tpInstant.getEpochSecond() - startEpoch);
            timestamps.add(elapsed);

            if (tp.heartRateBpm != null && tp.heartRateBpm.value != null) {
                heartRate.add(tp.heartRateBpm.value.shortValue()); hasHr = true;
            } else heartRate.add(null);

            Integer tpPower = null, tpCad = null;
            if (tp.extensions != null && tp.extensions.tpx != null) {
                tpPower = tp.extensions.tpx.watts;
                tpCad   = tp.extensions.tpx.cadence;
            }
            if (tpPower != null) { power.add(tpPower.shortValue()); hasPower = true; }
            else power.add(null);
            if (tpCad != null) { cadence.add(tpCad.shortValue()); hasCad = true; }
            else cadence.add(null);

            if (tp.altitudeMeters != null) { altitude.add(tp.altitudeMeters.floatValue()); hasAlt = true; }
            else altitude.add(null);

            if (tp.position != null) {
                latitude.add(tp.position.latitudeDegrees);
                longitude.add(tp.position.longitudeDegrees);
                hasGps = true;
            } else { latitude.add(null); longitude.add(null); }

            if (tp.distanceMeters != null) { distance.add(tp.distanceMeters.floatValue()); hasDist = true; }
            else distance.add(null);
        }

        return new ParsedStreams(
                timestamps,
                hasHr    ? heartRate  : null,
                hasPower ? power      : null,
                hasCad   ? cadence    : null,
                null, // speed not directly in TCX trackpoints
                hasAlt   ? altitude   : null,
                hasGps   ? latitude   : null,
                hasGps   ? longitude  : null,
                hasDist  ? distance   : null,
                null  // temperature not in standard TCX
        );
    }

    private static Instant parseInstantOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Instant.parse(s); } catch (Exception e) { return null; }
    }

    private static String mapSport(String tcxSport) {
        if (tcxSport == null) return "other";
        return switch (tcxSport.toLowerCase()) {
            case "biking"   -> "cycling";
            case "running"  -> "running";
            case "swimming" -> "swimming";
            case "other"    -> "other";
            default         -> tcxSport.toLowerCase();
        };
    }

    // ── Jackson XML DTOs ──────────────────────────────────────────────────────

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
    }
}
