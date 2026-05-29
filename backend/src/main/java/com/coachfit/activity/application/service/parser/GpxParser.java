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
 * Parses GPX (GPS Exchange Format) files using Jackson XML.
 *
 * <h3>GPX hierarchy mapped (GPX 1.1)</h3>
 * <pre>
 * gpx
 *   trk
 *     name
 *     trkseg
 *       trkpt (lat, lon attributes)
 *         ele
 *         time
 *         extensions
 *           gpxtpx:TrackPointExtension
 *             gpxtpx:hr
 *             gpxtpx:cad
 *             gpxtpx:atemp
 * </pre>
 *
 * <p>GPX has no native lap concept → the entire track is represented as a
 * single synthetic lap. Duration is derived from first to last {@code time}
 * element.
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

        GpxTrack trk = root.track;
        String name = (trk.name != null && !trk.name.isBlank()) ? trk.name : "GPX Activity";

        // Collect all trkpts from all trkseg elements
        List<GpxPoint> points = new ArrayList<>();
        if (trk.segments != null) {
            for (GpxSegment seg : trk.segments) {
                if (seg.points != null) points.addAll(seg.points);
            }
        }

        if (points.isEmpty()) {
            throw new FileParseException("GPX", "Track contains no trackpoints");
        }

        // Determine start time and duration
        Instant startedAt = null;
        Instant endedAt   = null;
        for (GpxPoint pt : points) {
            Instant t = parseInstantOrNull(pt.time);
            if (t == null) continue;
            if (startedAt == null || t.isBefore(startedAt)) startedAt = t;
            if (endedAt   == null || t.isAfter(endedAt))    endedAt   = t;
        }
        if (startedAt == null) startedAt = Instant.EPOCH;
        int durationSeconds = (startedAt != Instant.EPOCH && endedAt != null)
                ? (int)(endedAt.getEpochSecond() - startedAt.getEpochSecond()) : 0;

        // Start coords
        Double startLat = points.get(0).lat;
        Double startLng = points.get(0).lon;

        // Compute derived distance from consecutive coordinates (simple haversine)
        double totalDistanceMeters = computeDistance(points);

        // Build streams
        ParsedStreams streams = buildStreams(points, startedAt);

        // Aggregate HR and cadence from extensions
        long hrSum = 0, hrCount = 0, cadSum = 0, cadCount = 0;
        for (GpxPoint pt : points) {
            if (pt.extensions != null && pt.extensions.tpx != null) {
                if (pt.extensions.tpx.hr != null) { hrSum += pt.extensions.tpx.hr; hrCount++; }
                if (pt.extensions.tpx.cad != null){ cadSum += pt.extensions.tpx.cad; cadCount++; }
            }
        }
        Integer avgHr  = hrCount  > 0 ? (int)(hrSum  / hrCount)  : null;
        Integer avgCad = cadCount > 0 ? (int)(cadSum / cadCount) : null;

        BigDecimal distance = totalDistanceMeters > 0
                ? BigDecimal.valueOf(totalDistanceMeters).setScale(2, RoundingMode.HALF_UP) : null;

        // GPX → single synthetic lap
        List<ParsedLap> laps = List.of(new ParsedLap(
                0, startedAt, durationSeconds, distance,
                avgHr, null, null, null, avgCad, null, null
        ));

        return new ParsedActivity(
                "other", null, name, startedAt, durationSeconds, null,
                distance, null, null,
                avgHr, null, null, null, avgCad, null,
                startLat, startLng, laps, streams
        );
    }

    private ParsedStreams buildStreams(List<GpxPoint> points, Instant activityStart) {
        long startEpoch = activityStart.getEpochSecond();

        List<Integer> timestamps = new ArrayList<>();
        List<Short>   heartRate  = new ArrayList<>();
        List<Short>   cadence    = new ArrayList<>();
        List<Short>   temperature= new ArrayList<>();
        List<Float>   altitude   = new ArrayList<>();
        List<Double>  latitude   = new ArrayList<>();
        List<Double>  longitude  = new ArrayList<>();

        boolean hasHr = false, hasCad = false, hasTemp = false, hasAlt = false;

        for (GpxPoint pt : points) {
            Instant t = parseInstantOrNull(pt.time);
            int elapsed = (t != null) ? (int)(t.getEpochSecond() - startEpoch) : 0;
            timestamps.add(elapsed);
            latitude.add(pt.lat);
            longitude.add(pt.lon);

            if (pt.ele != null) { altitude.add(pt.ele.floatValue()); hasAlt = true; }
            else altitude.add(null);

            if (pt.extensions != null && pt.extensions.tpx != null) {
                GpxTpx tpx = pt.extensions.tpx;
                if (tpx.hr != null)   { heartRate.add(tpx.hr.shortValue());   hasHr   = true; } else heartRate.add(null);
                if (tpx.cad != null)  { cadence.add(tpx.cad.shortValue());    hasCad  = true; } else cadence.add(null);
                if (tpx.atemp != null){ temperature.add(tpx.atemp.shortValue()); hasTemp = true; } else temperature.add(null);
            } else {
                heartRate.add(null);
                cadence.add(null);
                temperature.add(null);
            }
        }

        return new ParsedStreams(
                timestamps,
                hasHr   ? heartRate   : null,
                null,  // power not in standard GPX
                hasCad  ? cadence     : null,
                null,  // speed — could derive from consecutive distances/times, deferred
                hasAlt  ? altitude    : null,
                latitude,
                longitude,
                null,  // cumulative distance — not directly in GPX
                hasTemp ? temperature : null
        );
    }

    /**
     * Simple cumulative distance using the equirectangular approximation.
     * Accurate enough for sport tracking at these scales.
     */
    private double computeDistance(List<GpxPoint> points) {
        double total = 0;
        final double R = 6_371_000; // Earth radius in meters
        for (int i = 1; i < points.size(); i++) {
            GpxPoint a = points.get(i - 1);
            GpxPoint b = points.get(i);
            if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) continue;
            double lat1 = Math.toRadians(a.lat);
            double lat2 = Math.toRadians(b.lat);
            double dlat = Math.toRadians(b.lat - a.lat);
            double dlon = Math.toRadians(b.lon - a.lon);
            double ha   = Math.sin(dlat / 2) * Math.sin(dlat / 2)
                        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
            total += R * 2 * Math.atan2(Math.sqrt(ha), Math.sqrt(1 - ha));
        }
        return total;
    }

    private static Instant parseInstantOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Instant.parse(s); } catch (Exception e) { return null; }
    }

    // ── Jackson XML DTOs ──────────────────────────────────────────────────────

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
}
