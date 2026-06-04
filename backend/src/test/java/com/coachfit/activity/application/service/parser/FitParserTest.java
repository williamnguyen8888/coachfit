package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedStreams;
import com.garmin.fit.BufferEncoder;
import com.garmin.fit.DateTime;
import com.garmin.fit.FileIdMesg;
import com.garmin.fit.LapMesg;
import com.garmin.fit.RecordMesg;
import com.garmin.fit.SessionMesg;
import com.garmin.fit.Sport;
import com.garmin.fit.SubSport;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FitParserTest {

    private static final double SEMICIRCLE_SCALE = Math.pow(2, 31) / 180.0;

    private final FitParser parser = new FitParser();

    @Test
    void parse_fitBytesExtractsSummaryLapsAndStreams() {
        Instant startedAt = Instant.parse("2026-06-01T00:00:00Z");
        byte[] fitBytes = buildFitBytes(startedAt);

        ParsedActivity activity = parser.parse(fitBytes);

        assertThat(activity.sport()).isEqualTo("cycling");
        assertThat(activity.subSport()).isEqualTo("road");
        assertThat(activity.name()).isEqualTo("Cycling Activity");
        assertThat(activity.startedAt()).isEqualTo(startedAt);
        assertThat(activity.durationSeconds()).isEqualTo(3600);
        assertThat(activity.movingTimeSeconds()).isEqualTo(3500);
        assertThat(activity.distanceMeters()).isEqualByComparingTo("40000.00");
        assertThat(activity.elevationGainMeters()).isEqualByComparingTo("450.00");
        assertThat(activity.calories()).isEqualTo(900);
        assertThat(activity.avgHeartRate()).isEqualTo(150);
        assertThat(activity.maxHeartRate()).isEqualTo(178);
        assertThat(activity.avgPower()).isEqualTo(220);
        assertThat(activity.maxPower()).isEqualTo(410);
        assertThat(activity.normalizedPower()).isEqualTo(250);
        assertThat(activity.intensityFactor()).isEqualByComparingTo("0.830");
        assertThat(activity.tss()).isEqualByComparingTo("82.40");
        assertThat(activity.avgCadence()).isEqualTo(89);
        assertThat(activity.avgSpeed()).isEqualByComparingTo("11.1110");
        assertThat(activity.startLat()).isCloseTo(10.0, within(0.000001));
        assertThat(activity.startLng()).isCloseTo(106.0, within(0.000001));

        assertThat(activity.laps()).hasSize(1);
        assertThat(activity.laps().get(0).distanceMeters()).isEqualByComparingTo("20000.00");
        assertThat(activity.laps().get(0).avgCadence()).isEqualTo(88);
        assertThat(activity.laps().get(0).elevationGain()).isEqualByComparingTo("200.00");
        assertThat(activity.laps().get(0).avgPace()).isNull();

        ParsedStreams streams = activity.streams();
        assertThat(streams.timestamps()).containsExactly(0, 30);
        assertThat(streams.heartRate()).containsExactly((short) 145, (short) 150);
        assertThat(streams.power()).containsExactly((short) 210, (short) 230);
        assertThat(streams.cadence()).containsExactly((short) 85, (short) 90);
        assertThat(streams.speed()).containsExactly(10.5f, 11.0f);
        assertThat(streams.altitude()).containsExactly(12.0f, 15.0f);
        assertThat(streams.distance()).containsExactly(0.0f, 320.0f);
        assertThat(streams.temperature()).containsExactly((short) 27, (short) 28);
        assertThat(streams.grade()).containsExactly(1.5f, 2.0f);
    }

    private byte[] buildFitBytes(Instant startedAt) {
        BufferEncoder encoder = new BufferEncoder();
        encoder.open();

        FileIdMesg fileId = new FileIdMesg();
        fileId.setType(com.garmin.fit.File.ACTIVITY);
        fileId.setManufacturer(1);
        fileId.setProduct(1);
        fileId.setSerialNumber(1L);
        fileId.setTimeCreated(new DateTime(startedAt));

        RecordMesg firstRecord = new RecordMesg();
        firstRecord.setTimestamp(new DateTime(startedAt));
        firstRecord.setHeartRate((short) 145);
        firstRecord.setPower(210);
        firstRecord.setCadence((short) 85);
        firstRecord.setEnhancedSpeed(10.5f);
        firstRecord.setEnhancedAltitude(12.0f);
        firstRecord.setPositionLat(semicircle(10.0));
        firstRecord.setPositionLong(semicircle(106.0));
        firstRecord.setDistance(0.0f);
        firstRecord.setTemperature((byte) 27);
        firstRecord.setGrade(1.5f);

        RecordMesg secondRecord = new RecordMesg();
        secondRecord.setTimestamp(new DateTime(startedAt.plusSeconds(30)));
        secondRecord.setHeartRate((short) 150);
        secondRecord.setPower(230);
        secondRecord.setCadence((short) 90);
        secondRecord.setEnhancedSpeed(11.0f);
        secondRecord.setEnhancedAltitude(15.0f);
        secondRecord.setPositionLat(semicircle(10.002));
        secondRecord.setPositionLong(semicircle(106.003));
        secondRecord.setDistance(320.0f);
        secondRecord.setTemperature((byte) 28);
        secondRecord.setGrade(2.0f);

        LapMesg lap = new LapMesg();
        lap.setStartTime(new DateTime(startedAt));
        lap.setTimestamp(new DateTime(startedAt.plusSeconds(1800)));
        lap.setSport(Sport.CYCLING);
        lap.setSubSport(SubSport.ROAD);
        lap.setTotalElapsedTime(1800.0f);
        lap.setTotalDistance(20000.0f);
        lap.setAvgHeartRate((short) 148);
        lap.setMaxHeartRate((short) 170);
        lap.setAvgPower(215);
        lap.setMaxPower(360);
        lap.setAvgCadence((short) 88);
        lap.setTotalAscent(200);
        lap.setEnhancedAvgSpeed(11.1111f);

        SessionMesg session = new SessionMesg();
        session.setStartTime(new DateTime(startedAt));
        session.setTimestamp(new DateTime(startedAt.plusSeconds(3600)));
        session.setSport(Sport.CYCLING);
        session.setSubSport(SubSport.ROAD);
        session.setFirstLapIndex(0);
        session.setNumLaps(1);
        session.setTotalElapsedTime(3600.0f);
        session.setTotalMovingTime(3500.0f);
        session.setTotalDistance(40000.0f);
        session.setTotalAscent(450);
        session.setTotalCalories(900);
        session.setAvgHeartRate((short) 150);
        session.setMaxHeartRate((short) 178);
        session.setAvgPower(220);
        session.setMaxPower(410);
        session.setNormalizedPower(250);
        session.setIntensityFactor(0.83f);
        session.setTrainingStressScore(82.4f);
        session.setAvgCadence((short) 89);
        session.setEnhancedAvgSpeed(11.1111f);

        encoder.write(List.of(fileId, firstRecord, secondRecord, lap, session));
        return encoder.close();
    }

    private static int semicircle(double degrees) {
        return (int) Math.round(degrees * SEMICIRCLE_SCALE);
    }

    private static org.assertj.core.data.Offset<Double> within(double value) {
        return org.assertj.core.data.Offset.offset(value);
    }
}
