package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.UploadActivityUseCase;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStoragePort;
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
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the manual FIT/TCX/GPX upload pipeline.
 *
 * <h3>BUG-16 fix — MinIO / Transaction decoupling</h3>
 * <p>The MinIO upload is intentionally performed BEFORE the DB transaction
 * opens. {@link ActivityPersistenceOrchestrator#persist} owns the transaction.
 * If the DB write fails, this service deletes the orphaned MinIO object.
 *
 * <h3>BUG-17 fix — null sentinel values</h3>
 * <p>Stream arrays use type-safe sentinels ({@code Integer.MIN_VALUE},
 * {@code Short.MIN_VALUE}, {@code Float.NaN}, {@code Double.NaN}) instead of
 * silently coercing null to 0. Downstream consumers (API layer, charts) must
 * treat these sentinels as "no data at this timestamp".
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
    private final ActivityPersistenceOrchestrator persistenceOrchestrator;

    public ActivityUploadService(FileFormatDetector detector,
                                 FitParser fitParser,
                                 TcxParser tcxParser,
                                 GpxParser gpxParser,
                                 ActivityStoragePort storagePort,
                                 ActivityPersistencePort activityPort,
                                 ActivityPersistenceOrchestrator persistenceOrchestrator) {
        this.detector = detector;
        this.fitParser = fitParser;
        this.tcxParser = tcxParser;
        this.gpxParser = gpxParser;
        this.storagePort = storagePort;
        this.activityPort = activityPort;
        this.persistenceOrchestrator = persistenceOrchestrator;
    }

    @Override
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

        // BUG-16 fix: duplicate check BEFORE file upload (avoids unnecessary storage write)
        Optional<UUID> existing = activityPort.findDuplicate(
                userId, parsed.startedAt(), parsed.sport(), parsed.durationSeconds());
        if (existing.isPresent()) {
            log.info("Duplicate detected: existingId={}", existing.get());
            throw new DuplicateActivityException(existing.get());
        }

        // Pre-convert streams and laps outside the transaction
        boolean hasStream = hasAnyStream(parsed.streams());
        StreamData streamData = hasStream ? toStreamData(parsed.streams()) : null;
        List<LapData> lapData = toLapData(parsed.laps());

        String contentType = switch (format) {
            case FIT -> "application/octet-stream";
            case TCX -> "application/vnd.garmin.tcx+xml";
            case GPX -> "application/gpx+xml";
        };

        // BUG-16 fix: upload to MinIO OUTSIDE the DB transaction.
        // If the DB commit fails, we delete the uploaded file below.
        String rawFilePath = storagePort.storeRawFile(userId, originalFilename, fileBytes, contentType);
        log.debug("Raw file stored: path={}", rawFilePath);

        try {
            ActivitySummary summary = persistenceOrchestrator.persist(
                    userId, parsed, rawFilePath, formatStr, hasStream, streamData, lapData);
            log.info("Upload complete: activityId={} format={}", summary.id(), formatStr);
            return summary;
        } catch (Exception e) {
            // BUG-16 fix: DB transaction failed — roll back the MinIO object
            try {
                storagePort.deleteFile(rawFilePath);
                log.warn("Rolled back MinIO file after DB failure: path={}", rawFilePath);
            } catch (Exception deleteEx) {
                log.error("Failed to clean up MinIO file after DB error: path={}", rawFilePath, deleteEx);
            }
            throw e;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
                        lap.normalizedPower(),
                        lap.avgCadence(),
                        lap.avgPace(),
                        lap.maxSpeed(),
                        lap.elevationGain(),
                        lap.elevationDescent(),
                        lap.lapTrigger()))
                .collect(Collectors.toList());
    }

    /**
     * BUG-17 fix: Convert {@code List<Integer>} → {@code int[]}, replacing null with
     * {@link Integer#MIN_VALUE} as a sentinel for "no data at this timestamp".
     * Consumers must treat {@code Integer.MIN_VALUE} as null when rendering.
     */
    private static int[] toIntArray(List<Integer> list) {
        int[] values = new int[list.size()];
        for (int i = 0; i < list.size(); i++) {
            Integer v = list.get(i);
            values[i] = (v != null) ? v : Integer.MIN_VALUE;
        }
        return values;
    }

    /**
     * BUG-17 fix: Convert {@code List<Short>} → {@code short[]}, using
     * {@link Short#MIN_VALUE} as null sentinel instead of 0.
     */
    private static short[] toShortArray(List<Short> list) {
        short[] values = new short[list.size()];
        for (int i = 0; i < list.size(); i++) {
            Short v = list.get(i);
            values[i] = (v != null) ? v : Short.MIN_VALUE;
        }
        return values;
    }

    /**
     * BUG-17 fix: Convert {@code List<Float>} → {@code float[]}, using
     * {@link Float#NaN} as null sentinel instead of 0.0f.
     */
    private static float[] toFloatArray(List<Float> list) {
        float[] values = new float[list.size()];
        for (int i = 0; i < list.size(); i++) {
            Float v = list.get(i);
            values[i] = (v != null) ? v : Float.NaN;
        }
        return values;
    }

    /**
     * BUG-17 fix: Convert {@code List<Double>} → {@code double[]}, using
     * {@link Double#NaN} as null sentinel instead of 0.0.
     */
    private static double[] toDoubleArray(List<Double> list) {
        double[] values = new double[list.size()];
        for (int i = 0; i < list.size(); i++) {
            Double v = list.get(i);
            values[i] = (v != null) ? v : Double.NaN;
        }
        return values;
    }
}
