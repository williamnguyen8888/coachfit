package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.UploadActivityUseCase;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStoragePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import com.coachfit.activity.application.service.parser.FileFormatDetector;
import com.coachfit.activity.application.service.parser.FitParser;
import com.coachfit.activity.application.service.parser.GpxParser;
import com.coachfit.activity.application.service.parser.TcxParser;
import com.coachfit.activity.domain.exception.DuplicateActivityException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the manual FIT/TCX/GPX upload pipeline.
 */
@Service
public class ActivityUploadService implements UploadActivityUseCase {

    private static final Logger log = LoggerFactory.getLogger(ActivityUploadService.class);

    private final FileFormatDetector detector;
    private final FitParser fitParser;
    private final TcxParser tcxParser;
    private final GpxParser gpxParser;
    private final ActivityStoragePort storagePort;
    private final ActivityPersistencePort activityPort;
    private final ActivityStreamPersistencePort streamPort;
    private final ActivityLapPersistencePort lapPort;
    private final ApplicationEventPublisher eventPublisher;

    public ActivityUploadService(FileFormatDetector detector,
                                 FitParser fitParser,
                                 TcxParser tcxParser,
                                 GpxParser gpxParser,
                                 ActivityStoragePort storagePort,
                                 ActivityPersistencePort activityPort,
                                 ActivityStreamPersistencePort streamPort,
                                 ActivityLapPersistencePort lapPort,
                                 ApplicationEventPublisher eventPublisher) {
        this.detector = detector;
        this.fitParser = fitParser;
        this.tcxParser = tcxParser;
        this.gpxParser = gpxParser;
        this.storagePort = storagePort;
        this.activityPort = activityPort;
        this.streamPort = streamPort;
        this.lapPort = lapPort;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public ActivitySummary upload(UUID userId, String originalFilename, byte[] fileBytes) {
        log.info("Upload started: user={} file={} bytes={}", userId, originalFilename, fileBytes.length);

        FileFormatDetector.Format format = detector.detect(originalFilename, fileBytes);
        String formatStr = format.name().toLowerCase();

        ParsedActivity parsed = switch (format) {
            case FIT -> fitParser.parse(fileBytes);
            case TCX -> tcxParser.parse(fileBytes);
            case GPX -> gpxParser.parse(fileBytes);
        };
        log.debug("Parsed: sport={} startedAt={} durationSeconds={}",
                parsed.sport(), parsed.startedAt(), parsed.durationSeconds());

        Optional<UUID> existing = activityPort.findDuplicate(
                userId, parsed.startedAt(), parsed.sport(), parsed.durationSeconds());
        if (existing.isPresent()) {
            log.info("Duplicate detected: existingId={}", existing.get());
            throw new DuplicateActivityException(existing.get());
        }

        String contentType = switch (format) {
            case FIT -> "application/octet-stream";
            case TCX -> "application/vnd.garmin.tcx+xml";
            case GPX -> "application/gpx+xml";
        };
        String rawFilePath = storagePort.storeRawFile(userId, originalFilename, fileBytes, contentType);
        log.debug("Raw file stored: path={}", rawFilePath);

        UUID activityId = activityPort.saveActivity(userId, parsed, rawFilePath, formatStr);
        log.debug("Activity saved: id={}", activityId);

        if (hasAnyStream(parsed.streams())) {
            streamPort.upsert(activityId, toStreamData(parsed.streams()));
        }

        if (!parsed.laps().isEmpty()) {
            lapPort.replaceAll(activityId, toLapData(parsed.laps()));
        }

        log.info("Upload complete: activityId={} format={}", activityId, formatStr);

        ActivitySummary summary = activityPort.findById(activityId);
        eventPublisher.publishEvent(new com.coachfit.shared.domain.event.ActivityCreatedEvent(
                userId,
                activityId,
                summary.sport(),
                summary.name(),
                null,
                summary.startedAt(),
                summary.durationSeconds(),
                summary.distanceMeters() != null ? java.math.BigDecimal.valueOf(summary.distanceMeters()) : null,
                parsed.tss()
        ));

        return summary;
    }

    private boolean hasAnyStream(ParsedStreams streams) {
        return streams.timestamps() != null
                || streams.heartRate() != null
                || streams.power() != null
                || streams.cadence() != null
                || streams.speed() != null
                || streams.altitude() != null
                || streams.latitude() != null
                || streams.longitude() != null
                || streams.distance() != null
                || streams.temperature() != null
                || streams.grade() != null;
    }

    private StreamData toStreamData(ParsedStreams streams) {
        return new StreamData(
                streams.timestamps() != null ? toIntArray(streams.timestamps()) : null,
                streams.heartRate() != null ? toShortArray(streams.heartRate()) : null,
                streams.power() != null ? toShortArray(streams.power()) : null,
                streams.cadence() != null ? toShortArray(streams.cadence()) : null,
                streams.speed() != null ? toFloatArray(streams.speed()) : null,
                streams.altitude() != null ? toFloatArray(streams.altitude()) : null,
                streams.latitude() != null ? toDoubleArray(streams.latitude()) : null,
                streams.longitude() != null ? toDoubleArray(streams.longitude()) : null,
                streams.distance() != null ? toFloatArray(streams.distance()) : null,
                streams.temperature() != null ? toShortArray(streams.temperature()) : null,
                streams.grade() != null ? toFloatArray(streams.grade()) : null
        );
    }

    private List<LapData> toLapData(List<ParsedLap> laps) {
        return laps.stream()
                .map(lap -> new LapData(
                        (short) lap.lapIndex(),
                        lap.startTime(),
                        lap.durationSeconds(),
                        lap.distanceMeters(),
                        lap.avgHeartRate(),
                        lap.maxHeartRate(),
                        lap.avgPower(),
                        lap.maxPower(),
                        lap.avgCadence(),
                        lap.avgPace(),
                        lap.elevationGain()))
                .collect(Collectors.toList());
    }

    private static int[] toIntArray(List<Integer> list) {
        int[] values = new int[list.size()];
        for (int i = 0; i < list.size(); i++) values[i] = list.get(i) != null ? list.get(i) : 0;
        return values;
    }

    private static short[] toShortArray(List<Short> list) {
        short[] values = new short[list.size()];
        for (int i = 0; i < list.size(); i++) values[i] = list.get(i) != null ? list.get(i) : 0;
        return values;
    }

    private static float[] toFloatArray(List<Float> list) {
        float[] values = new float[list.size()];
        for (int i = 0; i < list.size(); i++) values[i] = list.get(i) != null ? list.get(i) : 0f;
        return values;
    }

    private static double[] toDoubleArray(List<Double> list) {
        double[] values = new double[list.size()];
        for (int i = 0; i < list.size(); i++) values[i] = list.get(i) != null ? list.get(i) : 0.0;
        return values;
    }
}
