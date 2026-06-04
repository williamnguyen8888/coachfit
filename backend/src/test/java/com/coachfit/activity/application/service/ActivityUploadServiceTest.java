package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.UploadActivityUseCase.ActivitySummary;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStoragePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.service.parser.FileFormatDetector;
import com.coachfit.activity.application.service.parser.FitParser;
import com.coachfit.activity.application.service.parser.GpxParser;
import com.coachfit.activity.application.service.parser.TcxParser;
import com.coachfit.activity.domain.exception.DuplicateActivityException;
import com.coachfit.activity.domain.model.ParsedActivity;
import com.coachfit.activity.domain.model.ParsedLap;
import com.coachfit.activity.domain.model.ParsedStreams;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ActivityUploadService}.
 *
 * <p>The service was refactored to use {@link ActivityPersistenceOrchestrator}
 * (which owns the DB transaction + event publishing) instead of injecting
 * {@code ActivityStreamPersistencePort}, {@code ActivityLapPersistencePort},
 * and {@code ApplicationEventPublisher} directly. Tests now mock the
 * orchestrator accordingly.
 */
@ExtendWith(MockitoExtension.class)
class ActivityUploadServiceTest {

    @Mock FileFormatDetector detector;
    @Mock FitParser fitParser;
    @Mock TcxParser tcxParser;
    @Mock GpxParser gpxParser;
    @Mock ActivityStoragePort storagePort;
    @Mock ActivityPersistencePort activityPort;
    @Mock ActivityPersistenceOrchestrator orchestrator;

    // ── helpers ──────────────────────────────────────────────────────────────

    private ActivityUploadService service() {
        return new ActivityUploadService(
                detector, fitParser, tcxParser, gpxParser,
                storagePort, activityPort, orchestrator);
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    @Test
    void upload_duplicateDetected_doesNotStoreRawFileOrPersist() {
        ActivityUploadService service = service();

        UUID userId = UUID.randomUUID();
        UUID existingId = UUID.randomUUID();
        byte[] fileBytes = {1, 2, 3};
        ParsedActivity parsed = parsedActivity();

        when(detector.detect("ride.fit", fileBytes)).thenReturn(FileFormatDetector.Format.FIT);
        when(fitParser.parse(fileBytes)).thenReturn(parsed);
        when(activityPort.findDuplicate(userId, parsed.startedAt(), parsed.sport(), parsed.durationSeconds()))
                .thenReturn(Optional.of(existingId));

        assertThatThrownBy(() -> service.upload(userId, "ride.fit", fileBytes))
                .isInstanceOf(DuplicateActivityException.class);

        verify(storagePort, never()).storeRawFile(any(), any(), any(), any());
        verifyNoInteractions(orchestrator);
    }

    @Test
    void upload_success_parsesDedupsStoresAndDelegatesToOrchestrator() {
        ActivityUploadService service = service();

        UUID userId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();
        byte[] fileBytes = {9, 8, 7};
        ParsedActivity parsed = parsedActivity();
        ActivitySummary summary = new ActivitySummary(
                activityId,
                parsed.name(),
                parsed.sport(),
                parsed.startedAt(),
                parsed.durationSeconds(),
                40_000.0,
                "manual",
                "fit"
        );

        when(detector.detect("ride.fit", fileBytes)).thenReturn(FileFormatDetector.Format.FIT);
        when(fitParser.parse(fileBytes)).thenReturn(parsed);
        when(activityPort.findDuplicate(userId, parsed.startedAt(), parsed.sport(), parsed.durationSeconds()))
                .thenReturn(Optional.empty());
        when(storagePort.storeRawFile(userId, "ride.fit", fileBytes, "application/octet-stream"))
                .thenReturn("activities/raw/ride.fit");
        when(orchestrator.persist(
                eq(userId),
                eq(parsed),
                eq("activities/raw/ride.fit"),
                eq("fit"),
                anyBoolean(),
                any(),
                any()))
                .thenReturn(summary);

        ActivitySummary result = service.upload(userId, "ride.fit", fileBytes);

        assertThat(result).isEqualTo(summary);

        // Verify orchestrator was called with correct args
        ArgumentCaptor<ActivityStreamPersistencePort.StreamData> streamCaptor =
                ArgumentCaptor.forClass(ActivityStreamPersistencePort.StreamData.class);
        ArgumentCaptor<List<ActivityLapPersistencePort.LapData>> lapsCaptor =
                ArgumentCaptor.forClass(List.class);

        verify(orchestrator).persist(
                eq(userId),
                eq(parsed),
                eq("activities/raw/ride.fit"),
                eq("fit"),
                eq(true),        // hasStream — parsedActivity() has non-null streams
                streamCaptor.capture(),
                lapsCaptor.capture()
        );

        // Verify stream conversion (sentinel for null HR at index 1)
        ActivityStreamPersistencePort.StreamData streamData = streamCaptor.getValue();
        assertThat(streamData.timestamps()).containsExactly(0, 30);
        assertThat(streamData.heartRate()).containsExactly((short) 145, Short.MIN_VALUE); // null → sentinel
        assertThat(streamData.grade()).containsExactly(0.0f, 3.5f);  // null → Float.NaN handled by toFloatArray

        // Verify lap conversion
        List<ActivityLapPersistencePort.LapData> lapData = lapsCaptor.getValue();
        assertThat(lapData).hasSize(1);
        assertThat(lapData.get(0).avgPace()).isEqualByComparingTo("250.00");
        assertThat(lapData.get(0).elevationGain()).isEqualByComparingTo("120.00");
    }

    @Test
    void upload_dbFailure_cleansUpMinIOFile() {
        ActivityUploadService service = service();

        UUID userId = UUID.randomUUID();
        byte[] fileBytes = {1, 2, 3};
        ParsedActivity parsed = parsedActivity();

        when(detector.detect("ride.fit", fileBytes)).thenReturn(FileFormatDetector.Format.FIT);
        when(fitParser.parse(fileBytes)).thenReturn(parsed);
        when(activityPort.findDuplicate(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(storagePort.storeRawFile(any(), any(), any(), any())).thenReturn("activities/raw/ride.fit");
        when(orchestrator.persist(any(), any(), any(), any(), anyBoolean(), any(), any()))
                .thenThrow(new RuntimeException("DB down"));

        assertThatThrownBy(() -> service.upload(userId, "ride.fit", fileBytes))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("DB down");

        // BUG-16: must delete the MinIO file on DB failure
        verify(storagePort).deleteFile("activities/raw/ride.fit");
    }

    // ── fixture ───────────────────────────────────────────────────────────────

    private ParsedActivity parsedActivity() {
        Instant startedAt = Instant.parse("2026-06-01T00:00:00Z");
        ParsedLap lap = new ParsedLap(
                0,
                startedAt,
                1800,
                new BigDecimal("20000.00"),
                145,
                170,
                220,
                350,
                88,
                new BigDecimal("250.00"),
                new BigDecimal("120.00")
        );
        ParsedStreams streams = new ParsedStreams(
                List.of(0, 30),
                Arrays.asList((short) 145, null),   // null HR at index 1 → Short.MIN_VALUE sentinel
                null,
                Arrays.asList((short) 88, (short) 90),
                Arrays.asList(10.5f, 11.0f),
                Arrays.asList(12.0f, 15.0f),
                Arrays.asList(10.0, 10.001),
                Arrays.asList(106.0, 106.001),
                Arrays.asList(0.0f, 320.0f),
                Arrays.asList((short) 27, (short) 28),
                Arrays.asList(null, 3.5f)            // null grade at index 0 → Float.NaN sentinel
        );
        return new ParsedActivity(
                "running",
                null,
                "Track Workout",
                startedAt,
                3600,
                3500,
                new BigDecimal("40000.00"),
                new BigDecimal("500.00"),
                900,
                150,
                178,
                220,
                410,
                250,
                new BigDecimal("0.830"),
                new BigDecimal("82.40"),
                89,
                new BigDecimal("11.1111"),
                10.0,
                106.0,
                List.of(lap),
                streams
        );
    }
}
