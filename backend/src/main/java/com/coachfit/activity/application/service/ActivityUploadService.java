package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.UploadActivityUseCase;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStoragePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import com.coachfit.activity.application.service.parser.*;
import com.coachfit.activity.domain.exception.DuplicateActivityException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the full manual file-upload ingestion pipeline:
 *
 * <ol>
 *   <li>Detect file format (FIT / TCX / GPX) by byte inspection</li>
 *   <li>Store raw file in MinIO (before transaction so corrupt files are still preserved)</li>
 *   <li>Parse with the appropriate format parser</li>
 *   <li>Fingerprint-based duplicate check</li>
 *   <li>Persist activity, streams, and laps in a single transaction</li>
 *   <li>Return an {@link ActivitySummary} for the 201 response</li>
 * </ol>
 */
@Service
public class ActivityUploadService implements UploadActivityUseCase {

    private static final Logger log = LoggerFactory.getLogger(ActivityUploadService.class);

    private final FileFormatDetector          detector;
    private final FitParser                   fitParser;
    private final TcxParser                   tcxParser;
    private final GpxParser                   gpxParser;
    private final ActivityStoragePort         storagePort;
    private final ActivityPersistencePort     activityPort;
    private final ActivityStreamPersistencePort streamPort;
    private final ActivityLapPersistencePort  lapPort;

    public ActivityUploadService(FileFormatDetector detector,
                                 FitParser fitParser,
                                 TcxParser tcxParser,
                                 GpxParser gpxParser,
                                 ActivityStoragePort storagePort,
                                 ActivityPersistencePort activityPort,
                                 ActivityStreamPersistencePort streamPort,
                                 ActivityLapPersistencePort lapPort) {
        this.detector     = detector;
        this.fitParser    = fitParser;
        this.tcxParser    = tcxParser;
        this.gpxParser    = gpxParser;
        this.storagePort  = storagePort;
        this.activityPort = activityPort;
        this.streamPort   = streamPort;
        this.lapPort      = lapPort;
    }

    // ── UploadActivityUseCase ─────────────────────────────────────────────────

    @Override
    @Transactional
    public ActivitySummary upload(UUID userId, String originalFilename, byte[] fileBytes) {
        log.info("Upload started: user={} file={} bytes={}", userId, originalFilename, fileBytes.length);

        // Step 1: Detect format (throws UnsupportedFileFormatException if unknown)
        FileFormatDetector.Format format = detector.detect(originalFilename, fileBytes);
        String formatStr = format.name().toLowerCase(); // "fit", "tcx", "gpx"

        // Step 2: Store raw file in MinIO (before parse — preserves even corrupt files)
        String contentType = switch (format) {
            case FIT -> "application/octet-stream";
            case TCX -> "application/vnd.garmin.tcx+xml";
            case GPX -> "application/gpx+xml";
        };
        String rawFilePath = storagePort.storeRawFile(userId, originalFilename, fileBytes, contentType);
        log.debug("Raw file stored: path={}", rawFilePath);

        // Step 3: Parse (throws FileParseException on failure)
        ParsedActivity parsed = switch (format) {
            case FIT -> fitParser.parse(fileBytes);
            case TCX -> tcxParser.parse(fileBytes);
            case GPX -> gpxParser.parse(fileBytes);
        };
        log.debug("Parsed: sport={} startedAt={} durationSeconds={}",
                parsed.sport(), parsed.startedAt(), parsed.durationSeconds());

        // Step 4: Duplicate detection (fingerprint: started_at ±60s, sport, duration ±60s)
        Optional<UUID> existing = activityPort.findDuplicate(
                userId, parsed.startedAt(), parsed.sport(), parsed.durationSeconds());
        if (existing.isPresent()) {
            log.info("Duplicate detected: existingId={}", existing.get());
            throw new DuplicateActivityException(existing.get());
        }

        // Step 5: Persist activity row
        UUID activityId = activityPort.saveActivity(userId, parsed, rawFilePath, formatStr);
        log.debug("Activity saved: id={}", activityId);

        // Step 6: Persist streams (convert List<T> → primitive arrays for the existing port)
        if (hasAnyStream(parsed.streams())) {
            streamPort.upsert(activityId, toStreamData(parsed.streams()));
        }

        // Step 7: Persist laps
        if (!parsed.laps().isEmpty()) {
            lapPort.replaceAll(activityId, toLapData(parsed.laps()));
        }

        log.info("Upload complete: activityId={} format={}", activityId, formatStr);

        // Step 8: Return summary for the HTTP 201 response
        return activityPort.findById(activityId);
    }

    // ── Conversion helpers ────────────────────────────────────────────────────

    private boolean hasAnyStream(ParsedStreams s) {
        return s.timestamps() != null || s.heartRate() != null || s.power() != null
            || s.cadence() != null    || s.speed() != null     || s.altitude() != null
            || s.latitude() != null   || s.longitude() != null || s.distance() != null
            || s.temperature() != null;
    }

    /**
     * Converts {@link ParsedStreams} (which uses boxed List types to allow nulls)
     * into the primitive-array {@link StreamData} expected by the existing stream port.
     * Null lists are passed through as null; lists with null elements have nulls
     * coerced to 0 to satisfy primitive array semantics.
     */
    private StreamData toStreamData(ParsedStreams s) {
        return new StreamData(
                s.timestamps()   != null ? toIntArray(s.timestamps())     : null,
                s.heartRate()    != null ? toShortArray(s.heartRate())    : null,
                s.power()        != null ? toShortArray(s.power())        : null,
                s.cadence()      != null ? toShortArray(s.cadence())      : null,
                s.speed()        != null ? toFloatArray(s.speed())        : null,
                s.altitude()     != null ? toFloatArray(s.altitude())     : null,
                s.latitude()     != null ? toDoubleArray(s.latitude())    : null,
                s.longitude()    != null ? toDoubleArray(s.longitude())   : null,
                s.distance()     != null ? toFloatArray(s.distance())     : null,
                s.temperature()  != null ? toShortArray(s.temperature())  : null,
                null  // grade — not populated by any parser in this iteration
        );
    }

    private List<LapData> toLapData(List<ParsedLap> laps) {
        return laps.stream()
                .map(l -> new LapData(
                        (short) l.lapIndex(),
                        l.startTime(),
                        l.durationSeconds(),
                        l.distanceMeters(),
                        l.avgHeartRate(),
                        l.maxHeartRate(),
                        l.avgPower(),
                        l.maxPower(),
                        l.avgCadence(),
                        l.avgPace(),
                        l.elevationGain()))
                .collect(Collectors.toList());
    }

    // ── Primitive array converters (null-element safe) ────────────────────────

    private static int[] toIntArray(List<Integer> list) {
        int[] a = new int[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i) : 0;
        return a;
    }

    private static short[] toShortArray(List<Short> list) {
        short[] a = new short[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i) : 0;
        return a;
    }

    private static float[] toFloatArray(List<Float> list) {
        float[] a = new float[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i) : 0f;
        return a;
    }

    private static double[] toDoubleArray(List<Double> list) {
        double[] a = new double[list.size()];
        for (int i = 0; i < list.size(); i++) a[i] = list.get(i) != null ? list.get(i) : 0.0;
        return a;
    }
}
