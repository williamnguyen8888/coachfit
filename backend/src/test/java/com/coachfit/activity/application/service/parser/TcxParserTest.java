package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TcxParserTest {

    private final TcxParser parser = new TcxParser();

    @Test
    void parse_runningTcx_extractsSummaryLapsAndStreams() {
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <TrainingCenterDatabase
                    xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
                    xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                  <Activities>
                    <Activity Sport="Running">
                      <Id>2026-06-01T06:00:00Z</Id>
                      <Lap StartTime="2026-06-01T06:00:00Z">
                        <TotalTimeSeconds>600</TotalTimeSeconds>
                        <DistanceMeters>3000</DistanceMeters>
                        <Calories>400</Calories>
                        <AverageHeartRateBpm><Value>145</Value></AverageHeartRateBpm>
                        <MaximumHeartRateBpm><Value>150</Value></MaximumHeartRateBpm>
                        <AverageRunCadence>82</AverageRunCadence>
                        <Extensions>
                          <ns3:LX>
                            <ns3:AvgWatts>220</ns3:AvgWatts>
                            <ns3:MaxWatts>260</ns3:MaxWatts>
                          </ns3:LX>
                        </Extensions>
                        <Track>
                          <Trackpoint>
                            <Time>2026-06-01T06:00:00Z</Time>
                            <Position>
                              <LatitudeDegrees>10.0</LatitudeDegrees>
                              <LongitudeDegrees>106.0</LongitudeDegrees>
                            </Position>
                            <AltitudeMeters>20.0</AltitudeMeters>
                            <DistanceMeters>0.0</DistanceMeters>
                            <HeartRateBpm><Value>142</Value></HeartRateBpm>
                            <Extensions>
                              <ns3:TPX>
                                <ns3:Watts>210</ns3:Watts>
                                <ns3:RunCadence>80</ns3:RunCadence>
                                <ns3:Speed>5.0</ns3:Speed>
                              </ns3:TPX>
                            </Extensions>
                          </Trackpoint>
                          <Trackpoint>
                            <Time>2026-06-01T06:05:00Z</Time>
                            <Position>
                              <LatitudeDegrees>10.005</LatitudeDegrees>
                              <LongitudeDegrees>106.005</LongitudeDegrees>
                            </Position>
                            <AltitudeMeters>28.0</AltitudeMeters>
                            <DistanceMeters>1500.0</DistanceMeters>
                            <HeartRateBpm><Value>148</Value></HeartRateBpm>
                            <Extensions>
                              <ns3:TPX>
                                <ns3:Watts>220</ns3:Watts>
                                <ns3:RunCadence>84</ns3:RunCadence>
                                <ns3:Speed>5.2</ns3:Speed>
                              </ns3:TPX>
                            </Extensions>
                          </Trackpoint>
                          <Trackpoint>
                            <Time>2026-06-01T06:10:00Z</Time>
                            <Position>
                              <LatitudeDegrees>10.010</LatitudeDegrees>
                              <LongitudeDegrees>106.010</LongitudeDegrees>
                            </Position>
                            <AltitudeMeters>25.0</AltitudeMeters>
                            <DistanceMeters>3000.0</DistanceMeters>
                            <HeartRateBpm><Value>154</Value></HeartRateBpm>
                            <Extensions>
                              <ns3:TPX>
                                <ns3:Watts>230</ns3:Watts>
                                <ns3:RunCadence>86</ns3:RunCadence>
                                <ns3:Speed>5.1</ns3:Speed>
                              </ns3:TPX>
                            </Extensions>
                          </Trackpoint>
                        </Track>
                      </Lap>
                      <Lap StartTime="2026-06-01T06:10:00Z">
                        <TotalTimeSeconds>300</TotalTimeSeconds>
                        <DistanceMeters>2000</DistanceMeters>
                        <Calories>250</Calories>
                        <AverageHeartRateBpm><Value>155</Value></AverageHeartRateBpm>
                        <MaximumHeartRateBpm><Value>162</Value></MaximumHeartRateBpm>
                        <AverageRunCadence>88</AverageRunCadence>
                        <Extensions>
                          <ns3:LX>
                            <ns3:AvgWatts>240</ns3:AvgWatts>
                            <ns3:MaxWatts>290</ns3:MaxWatts>
                          </ns3:LX>
                        </Extensions>
                        <Track>
                          <Trackpoint>
                            <Time>2026-06-01T06:12:30Z</Time>
                            <Position>
                              <LatitudeDegrees>10.015</LatitudeDegrees>
                              <LongitudeDegrees>106.015</LongitudeDegrees>
                            </Position>
                            <AltitudeMeters>29.0</AltitudeMeters>
                            <DistanceMeters>4000.0</DistanceMeters>
                            <HeartRateBpm><Value>158</Value></HeartRateBpm>
                            <Extensions>
                              <ns3:TPX>
                                <ns3:Watts>240</ns3:Watts>
                                <ns3:RunCadence>88</ns3:RunCadence>
                                <ns3:Speed>5.3</ns3:Speed>
                              </ns3:TPX>
                            </Extensions>
                          </Trackpoint>
                          <Trackpoint>
                            <Time>2026-06-01T06:15:00Z</Time>
                            <Position>
                              <LatitudeDegrees>10.020</LatitudeDegrees>
                              <LongitudeDegrees>106.020</LongitudeDegrees>
                            </Position>
                            <AltitudeMeters>30.0</AltitudeMeters>
                            <DistanceMeters>5000.0</DistanceMeters>
                            <HeartRateBpm><Value>160</Value></HeartRateBpm>
                            <Extensions>
                              <ns3:TPX>
                                <ns3:Watts>250</ns3:Watts>
                                <ns3:RunCadence>90</ns3:RunCadence>
                                <ns3:Speed>5.4</ns3:Speed>
                              </ns3:TPX>
                            </Extensions>
                          </Trackpoint>
                        </Track>
                      </Lap>
                    </Activity>
                  </Activities>
                </TrainingCenterDatabase>
                """;

        ParsedActivity activity = parser.parse(xml.getBytes(StandardCharsets.UTF_8));

        assertThat(activity.sport()).isEqualTo("running");
        assertThat(activity.name()).isEqualTo("Running Activity");
        assertThat(activity.startedAt()).isEqualTo(Instant.parse("2026-06-01T06:00:00Z"));
        assertThat(activity.durationSeconds()).isEqualTo(900);
        assertThat(activity.distanceMeters()).isEqualByComparingTo("5000.00");
        assertThat(activity.elevationGainMeters()).isEqualByComparingTo("13.00");
        assertThat(activity.calories()).isEqualTo(650);
        assertThat(activity.avgHeartRate()).isEqualTo(152);
        assertThat(activity.maxHeartRate()).isEqualTo(162);
        assertThat(activity.avgPower()).isEqualTo(230);
        assertThat(activity.maxPower()).isEqualTo(290);
        assertThat(activity.avgCadence()).isEqualTo(86);
        assertThat(activity.avgSpeed()).isEqualByComparingTo("5.5556");
        assertThat(activity.startLat()).isEqualTo(10.0);
        assertThat(activity.startLng()).isEqualTo(106.0);

        assertThat(activity.laps()).hasSize(2);
        ParsedLap firstLap = activity.laps().get(0);
        assertThat(firstLap.distanceMeters()).isEqualByComparingTo("3000.00");
        assertThat(firstLap.avgCadence()).isEqualTo(82);
        assertThat(firstLap.avgPace()).isEqualByComparingTo("200.00");

        ParsedLap secondLap = activity.laps().get(1);
        assertThat(secondLap.distanceMeters()).isEqualByComparingTo("2000.00");
        assertThat(secondLap.avgCadence()).isEqualTo(88);
        assertThat(secondLap.avgPace()).isEqualByComparingTo("150.00");

        ParsedStreams streams = activity.streams();
        assertThat(streams.timestamps()).containsExactly(0, 300, 600, 750, 900);
        assertThat(streams.heartRate()).containsExactly((short) 142, (short) 148, (short) 154, (short) 158, (short) 160);
        assertThat(streams.power()).containsExactly((short) 210, (short) 220, (short) 230, (short) 240, (short) 250);
        assertThat(streams.cadence()).containsExactly((short) 80, (short) 84, (short) 86, (short) 88, (short) 90);
        assertThat(streams.speed()).containsExactly(5.0f, 5.2f, 5.1f, 5.3f, 5.4f);
        assertThat(streams.distance()).containsExactly(0.0f, 1500.0f, 3000.0f, 4000.0f, 5000.0f);
        assertThat(streams.grade()).hasSize(5);
        assertThat(streams.grade().get(0)).isNull();
        assertThat(streams.grade().get(1)).isCloseTo(0.5333f, within(0.0005f));
        assertThat(streams.grade().get(2)).isCloseTo(-0.2f, within(0.0005f));
        assertThat(streams.grade().get(3)).isCloseTo(0.4f, within(0.0005f));
        assertThat(streams.grade().get(4)).isCloseTo(0.1f, within(0.0005f));
    }

    private static org.assertj.core.data.Offset<Float> within(float value) {
        return org.assertj.core.data.Offset.offset(value);
    }
}
