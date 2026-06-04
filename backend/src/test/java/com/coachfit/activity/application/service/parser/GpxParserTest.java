package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedStreams;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class GpxParserTest {

    private final GpxParser parser = new GpxParser();

    @Test
    void parse_gpxDerivesDistanceSpeedGradeAndElevation() {
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <gpx version="1.1"
                     creator="CoachFit"
                     xmlns="http://www.topografix.com/GPX/1/1"
                     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
                  <trk>
                    <name>Morning GPX</name>
                    <trkseg>
                      <trkpt lat="10.0" lon="106.0">
                        <ele>5.0</ele>
                        <time>2026-06-01T00:00:00Z</time>
                        <extensions>
                          <gpxtpx:TrackPointExtension>
                            <gpxtpx:hr>140</gpxtpx:hr>
                            <gpxtpx:cad>82</gpxtpx:cad>
                            <gpxtpx:atemp>29</gpxtpx:atemp>
                          </gpxtpx:TrackPointExtension>
                        </extensions>
                      </trkpt>
                      <trkpt lat="10.0005" lon="106.0">
                        <ele>15.0</ele>
                        <time>2026-06-01T00:01:00Z</time>
                        <extensions>
                          <gpxtpx:TrackPointExtension>
                            <gpxtpx:hr>145</gpxtpx:hr>
                            <gpxtpx:cad>84</gpxtpx:cad>
                            <gpxtpx:atemp>30</gpxtpx:atemp>
                          </gpxtpx:TrackPointExtension>
                        </extensions>
                      </trkpt>
                      <trkpt lat="10.0010" lon="106.0005">
                        <ele>12.0</ele>
                        <time>2026-06-01T00:02:00Z</time>
                        <extensions>
                          <gpxtpx:TrackPointExtension>
                            <gpxtpx:hr>150</gpxtpx:hr>
                            <gpxtpx:cad>86</gpxtpx:cad>
                            <gpxtpx:atemp>31</gpxtpx:atemp>
                          </gpxtpx:TrackPointExtension>
                        </extensions>
                      </trkpt>
                    </trkseg>
                  </trk>
                </gpx>
                """;

        ParsedActivity activity = parser.parse(xml.getBytes(StandardCharsets.UTF_8));

        assertThat(activity.sport()).isEqualTo("other");
        assertThat(activity.name()).isEqualTo("Morning GPX");
        assertThat(activity.startedAt()).isEqualTo(Instant.parse("2026-06-01T00:00:00Z"));
        assertThat(activity.durationSeconds()).isEqualTo(120);
        assertThat(activity.distanceMeters()).isNotNull();
        assertThat(activity.distanceMeters().doubleValue()).isBetween(130.0, 140.0);
        assertThat(activity.elevationGainMeters()).isEqualByComparingTo("10.00");
        assertThat(activity.avgHeartRate()).isEqualTo(145);
        assertThat(activity.maxHeartRate()).isEqualTo(150);
        assertThat(activity.avgCadence()).isEqualTo(84);
        assertThat(activity.avgSpeed()).isNotNull();
        assertThat(activity.avgSpeed().doubleValue()).isBetween(1.0, 1.2);
        assertThat(activity.startLat()).isEqualTo(10.0);
        assertThat(activity.startLng()).isEqualTo(106.0);
        assertThat(activity.laps()).hasSize(1);
        assertThat(activity.laps().get(0).elevationGain()).isEqualByComparingTo("10.00");

        ParsedStreams streams = activity.streams();
        assertThat(streams.timestamps()).containsExactly(0, 60, 120);
        assertThat(streams.heartRate()).containsExactly((short) 140, (short) 145, (short) 150);
        assertThat(streams.cadence()).containsExactly((short) 82, (short) 84, (short) 86);
        assertThat(streams.temperature()).containsExactly((short) 29, (short) 30, (short) 31);
        assertThat(streams.distance()).hasSize(3);
        assertThat(streams.distance().get(0)).isEqualTo(0.0f);
        assertThat(streams.distance().get(2)).isBetween(130.0f, 140.0f);
        assertThat(streams.speed()).hasSize(3);
        assertThat(streams.speed().get(0)).isNull();
        assertThat(streams.speed().get(1)).isBetween(0.9f, 1.0f);
        assertThat(streams.speed().get(2)).isBetween(1.1f, 1.31f);
        assertThat(streams.grade()).hasSize(3);
        assertThat(streams.grade().get(0)).isNull();
        assertThat(streams.grade().get(1)).isBetween(17.0f, 19.0f);
        assertThat(streams.grade().get(2)).isBetween(-5.0f, -3.0f);
    }
}
