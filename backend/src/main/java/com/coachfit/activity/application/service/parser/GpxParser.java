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
import java.util.Map;

/**
 * Parses GPX activity files using Jackson XML.
 */
@Component
public class GpxParser {

    private final XmlMapper xmlMapper;

    public GpxParser() {
        this.xmlMapper = new XmlMapper();
        this.xmlMapper.configure(
                com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public ParsedActivity parse(byte[] fileBytes) {
        GpxRoot root;
        try {
            root = xmlMapper.readValue(fileBytes, GpxRoot.class);
        } catch (Exception e) {
            throw new FileParseException("GPX", "XML parse error: " + e.getMessage(), e);
        }

        if (root == null || root.track == null) {
            throw new FileParseException("GPX", "No track (trk) element found");
        }

        GpxTrack track = root.track;
        String name = (track.name != null && !track.name.isBlank()) ? track.name : "GPX Activity";
        // BUG-7 fix: map the optional <type> tag to a sport string
        String sport = mapSport(track.type);

        List<GpxPoint> points = new ArrayList<>();
        if (track.segments != null) {
            for (GpxSegment segment : track.segments) {
                if (segment.points != null) points.addAll(segment.points);
            }
        }

        if (points.isEmpty()) {
            throw new FileParseException("GPX", "Track contains no trackpoints");
        }

        Instant startedAt = null;
        Instant endedAt = null;
        for (GpxPoint point : points) {
            Instant timestamp = parseInstantOrNull(point.time);
            if (timestamp == null) continue;
            if (startedAt == null || timestamp.isBefore(startedAt)) startedAt = timestamp;
            if (endedAt == null || timestamp.isAfter(endedAt)) endedAt = timestamp;
        }
        if (startedAt == null) startedAt = Instant.EPOCH;

        // BUG-8 fix: use .equals() not reference comparison (!=) for Instant.EPOCH
        int durationSeconds = (!Instant.EPOCH.equals(startedAt) && endedAt != null)
                ? (int) (endedAt.getEpochSecond() - startedAt.getEpochSecond())
                : 0;

        GpxSummary summary = summarize(points);
        ParsedStreams streams = buildStreams(points, startedAt);

        BigDecimal distanceMeters = summary.totalDistanceMeters > 0d
                ? BigDecimal.valueOf(summary.totalDistanceMeters).setScale(2, RoundingMode.HALF_UP)
                : null;
        BigDecimal avgSpeed = distanceMeters != null && durationSeconds > 0
                ? BigDecimal.valueOf(summary.totalDistanceMeters / durationSeconds).setScale(4, RoundingMode.HALF_UP)
                : null;

        List<ParsedLap> laps = List.of(new ParsedLap(
                0,
                startedAt,
                durationSeconds > 0 ? durationSeconds : null,
                distanceMeters,
                summary.avgHeartRate,
                summary.maxHeartRate,
                null,                  // avgPower
                null,                  // maxPower
                null,                  // normalizedPower
                summary.avgCadence,
                null,                  // avgPace
                null,                  // maxSpeed
                summary.elevationGainMeters,
                null,                  // elevationDescent
                null                   // lapTrigger
        ));

        return new ParsedActivity(
                sport, // BUG-7 fix: use mapped sport, not hardcoded "other"
                null,
                name,
                startedAt,
                durationSeconds,
                null,                  // movingTimeSeconds
                distanceMeters,
                summary.elevationGainMeters,
                null,                  // totalDescentMeters — not available in GPX
                null,                  // calories
                summary.avgHeartRate,
                summary.maxHeartRate,
                null,                  // avgPower
                null,                  // maxPower
                null,                  // normalizedPower
                null,                  // intensityFactor
                null,                  // tss
                summary.avgCadence,
                avgSpeed,
                null,                  // maxSpeed
                null,                  // avgTemperature
                null,                  // minAltitude
                null,                  // maxAltitude
                null,                  // aerobicTrainingEffect
                null,                  // anaerobicTrainingEffect
                null,                  // avgVerticalOscillation
                null,                  // avgGroundContactTime
                null,                  // avgStepLength
                null,                  // avgVerticalRatio
                null,                  // leftRightBalance
                null,                  // avgLeftPedalSmoothness
                null,                  // avgLeftTorqueEffectiveness
                null,                  // poolLength
                null,                  // swimStroke
                null,                  // avgSwolf
                summary.startLat,
                summary.startLng,
                laps,
                streams
        );
    }

    private ParsedStreams buildStreams(List<GpxPoint> points, Instant activityStart) {
        long startEpoch = activityStart.getEpochSecond();

        List<Integer> timestamps = new ArrayList<>();
        List<Short> heartRate = new ArrayList<>();
        List<Short> cadence = new ArrayList<>();
        List<Short> temperature = new ArrayList<>();
        List<Float> speed = new ArrayList<>();
        List<Float> altitude = new ArrayList<>();
        List<Double> latitude = new ArrayList<>();
        List<Double> longitude = new ArrayList<>();
        List<Float> distance = new ArrayList<>();
        List<Float> grade = new ArrayList<>();

        boolean hasHr = false;
        boolean hasCadence = false;
        boolean hasTemp = false;
        boolean hasSpeed = false;
        boolean hasAltitude = false;
        boolean hasGrade = false;

        GpxPoint previousPoint = null;
        Instant previousTime = null;
        double cumulativeDistanceMeters = 0d;

        for (GpxPoint point : points) {
            Instant timestamp = parseInstantOrNull(point.time);

            // BUG-25 fix: skip points with no GPS coordinates entirely so all
            // stream arrays stay in sync by index. In GPX every trkpt should
            // have lat/lon; those without are waypoints or corrupt records.
            if (point.lat == null || point.lon == null) {
                previousPoint = point;
                previousTime = timestamp;
                continue;
            }

            int elapsed = timestamp != null ? (int) (timestamp.getEpochSecond() - startEpoch) : 0;
            timestamps.add(elapsed);

            latitude.add(point.lat);
            longitude.add(point.lon);

            if (point.ele != null) {
                altitude.add(point.ele.floatValue());
                hasAltitude = true;
            } else {
                altitude.add(null);
            }

            double segmentDistanceMeters = 0d;
            if (previousPoint != null) {
                segmentDistanceMeters = distanceBetween(previousPoint, point);
                if (!Double.isNaN(segmentDistanceMeters)) {
                    cumulativeDistanceMeters += segmentDistanceMeters;
                } else {
                    segmentDistanceMeters = 0d;
                }
            }
            distance.add((float) cumulativeDistanceMeters);

            Float pointSpeed = null;
            if (timestamp != null && previousTime != null && segmentDistanceMeters > 0d) {
                long deltaSeconds = timestamp.getEpochSecond() - previousTime.getEpochSecond();
                if (deltaSeconds > 0L) {
                    pointSpeed = (float) (segmentDistanceMeters / deltaSeconds);
                }
            }
            if (pointSpeed != null) {
                speed.add(pointSpeed);
                hasSpeed = true;
            } else {
                speed.add(null);
            }

            Float pointGrade = null;
            if (previousPoint != null && previousPoint.ele != null && point.ele != null && segmentDistanceMeters > 0d) {
                pointGrade = (float) (((point.ele - previousPoint.ele) / segmentDistanceMeters) * 100d);
            }
            if (pointGrade != null) {
                grade.add(pointGrade);
                hasGrade = true;
            } else {
                grade.add(null);
            }

            if (point.extensions != null && point.extensions.tpx != null) {
                GpxTpx tpx = point.extensions.tpx;
                if (tpx.hr != null) {
                    heartRate.add(tpx.hr.shortValue());
                    hasHr = true;
                } else {
                    heartRate.add(null);
                }
                if (tpx.cad != null) {
                    cadence.add(tpx.cad.shortValue());
                    hasCadence = true;
                } else {
                    cadence.add(null);
                }
                if (tpx.atemp != null) {
                    temperature.add(tpx.atemp.shortValue());
                    hasTemp = true;
                } else {
                    temperature.add(null);
                }
            } else {
                heartRate.add(null);
                cadence.add(null);
                temperature.add(null);
            }

            previousPoint = point;
            previousTime = timestamp;
        }

        // GPX always has GPS coordinates (we skipped non-GPS points above)
        boolean hasGps = !latitude.isEmpty();
        return new ParsedStreams(
                timestamps,
                hasHr ? heartRate : null,
                null,
                hasCadence ? cadence : null,
                hasSpeed ? speed : null,
                hasAltitude ? altitude : null,
                hasGps ? latitude : null,
                hasGps ? longitude : null,
                hasGps ? distance : null,
                hasTemp ? temperature : null,
                hasGrade ? grade : null
        );
    }

    private GpxSummary summarize(List<GpxPoint> points) {
        double totalDistanceMeters = 0d;
        double elevationGainMeters = 0d;
        Double startLat = points.get(0).lat;
        Double startLng = points.get(0).lon;
        GpxPoint previousPoint = null;

        long heartRateSum = 0L;
        long heartRateCount = 0L;
        Integer maxHeartRate = null;
        long cadenceSum = 0L;
        long cadenceCount = 0L;

        for (GpxPoint point : points) {
            if (previousPoint != null) {
                double segmentDistanceMeters = distanceBetween(previousPoint, point);
                if (!Double.isNaN(segmentDistanceMeters)) {
                    totalDistanceMeters += segmentDistanceMeters;
                }
                if (previousPoint.ele != null && point.ele != null && point.ele > previousPoint.ele) {
                    elevationGainMeters += point.ele - previousPoint.ele;
                }
            }

            if (point.extensions != null && point.extensions.tpx != null) {
                if (point.extensions.tpx.hr != null) {
                    int hr = point.extensions.tpx.hr;
                    heartRateSum += hr;
                    heartRateCount++;
                    maxHeartRate = maxNullable(maxHeartRate, hr);
                }
                if (point.extensions.tpx.cad != null) {
                    cadenceSum += point.extensions.tpx.cad;
                    cadenceCount++;
                }
            }

            previousPoint = point;
        }

        return new GpxSummary(
                totalDistanceMeters,
                elevationGainMeters > 0d
                        ? BigDecimal.valueOf(elevationGainMeters).setScale(2, RoundingMode.HALF_UP)
                        : null,
                heartRateCount > 0 ? (int) Math.round((double) heartRateSum / heartRateCount) : null,
                maxHeartRate,
                cadenceCount > 0 ? (int) Math.round((double) cadenceSum / cadenceCount) : null,
                startLat,
                startLng
        );
    }

    private static double distanceBetween(GpxPoint a, GpxPoint b) {
        if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) {
            return Double.NaN;
        }

        final double earthRadiusMeters = 6_371_000d;
        double lat1 = Math.toRadians(a.lat);
        double lat2 = Math.toRadians(b.lat);
        double dlat = Math.toRadians(b.lat - a.lat);
        double dlon = Math.toRadians(b.lon - a.lon);
        double haversine = Math.sin(dlat / 2d) * Math.sin(dlat / 2d)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2d) * Math.sin(dlon / 2d);
        return earthRadiusMeters * 2d * Math.atan2(Math.sqrt(haversine), Math.sqrt(1d - haversine));
    }

    private static Instant parseInstantOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private static Integer maxNullable(Integer a, Integer b) {
        if (a == null) return b;
        if (b == null) return a;
        return Math.max(a, b);
    }

    // ── Sport mapping (BUG-7) ────────────────────────────────────────────────

    /** Common GPX <type> values from Garmin Connect, Strava, Wahoo, etc. */
    private static final Map<String, String> GPX_TYPE_TO_SPORT = Map.ofEntries(
            Map.entry("cycling", "cycling"),
            Map.entry("biking", "cycling"),
            Map.entry("road cycling", "cycling"),
            Map.entry("mountain biking", "cycling"),
            Map.entry("virtual ride", "cycling"),
            Map.entry("running", "running"),
            Map.entry("trail running", "running"),
            Map.entry("treadmill running", "running"),
            Map.entry("swimming", "swimming"),
            Map.entry("open water swimming", "swimming"),
            Map.entry("hiking", "hiking"),
            Map.entry("walking", "walking"),
            Map.entry("rowing", "rowing"),
            Map.entry("paddling", "paddling"),
            Map.entry("cross country skiing", "cross_country_skiing"),
            Map.entry("alpine skiing", "alpine_skiing"),
            Map.entry("snowboarding", "snowboarding")
    );

    private static String mapSport(String type) {
        if (type == null || type.isBlank()) return "other";
        String normalized = type.trim().toLowerCase();
        return GPX_TYPE_TO_SPORT.getOrDefault(normalized, "other");
    }

    @JacksonXmlRootElement(localName = "gpx")
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxRoot {
        @JacksonXmlProperty(localName = "trk")
        GpxTrack track;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxTrack {
        @JacksonXmlProperty(localName = "name")
        String name;

        // BUG-7: read the optional <type> element for sport detection
        @JacksonXmlProperty(localName = "type")
        String type;

        @JacksonXmlProperty(localName = "trkseg")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<GpxSegment> segments;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxSegment {
        @JacksonXmlProperty(localName = "trkpt")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<GpxPoint> points;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxPoint {
        @JacksonXmlProperty(isAttribute = true, localName = "lat")
        Double lat;

        @JacksonXmlProperty(isAttribute = true, localName = "lon")
        Double lon;

        @JacksonXmlProperty(localName = "ele")
        Double ele;

        @JacksonXmlProperty(localName = "time")
        String time;

        @JacksonXmlProperty(localName = "extensions")
        GpxExtensions extensions;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxExtensions {
        @JacksonXmlProperty(localName = "TrackPointExtension")
        GpxTpx tpx;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GpxTpx {
        @JacksonXmlProperty(localName = "hr")
        Integer hr;

        @JacksonXmlProperty(localName = "cad")
        Integer cad;

        @JacksonXmlProperty(localName = "atemp")
        Integer atemp;
    }

    private record GpxSummary(
            double totalDistanceMeters,
            BigDecimal elevationGainMeters,
            Integer avgHeartRate,
            Integer maxHeartRate,
            Integer avgCadence,
            Double startLat,
            Double startLng
    ) {}
}
