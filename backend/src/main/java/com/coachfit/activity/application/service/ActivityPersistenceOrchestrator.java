package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.UploadActivityUseCase;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import com.coachfit.activity.domain.model.ParsedActivity;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Transactional DB persistence layer for the activity upload pipeline.
 *
 * <p>Extracted from {@link ActivityUploadService} so that the MinIO upload
 * (which is NOT a DB resource) can happen <em>before</em> this transaction
 * opens. This allows the caller to clean up the MinIO object on DB failure
 * without MinIO being inside the transaction scope (BUG-16 fix).
 */
@Service
class ActivityPersistenceOrchestrator {

    private final ActivityPersistencePort activityPort;
    private final ActivityStreamPersistencePort streamPort;
    private final ActivityLapPersistencePort lapPort;
    private final ApplicationEventPublisher eventPublisher;

    ActivityPersistenceOrchestrator(ActivityPersistencePort activityPort,
                                    ActivityStreamPersistencePort streamPort,
                                    ActivityLapPersistencePort lapPort,
                                    ApplicationEventPublisher eventPublisher) {
        this.activityPort = activityPort;
        this.streamPort = streamPort;
        this.lapPort = lapPort;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Persists the parsed activity, streams and laps in a single transaction,
     * then publishes the {@code ActivityCreatedEvent}.
     *
     * @param userId      authenticated user UUID
     * @param parsed      domain model produced by a parser
     * @param rawFilePath MinIO object key for the raw file
     * @param formatStr   lowercase format string ("fit", "tcx", "gpx")
     * @param hasStream   whether {@code parsed.streams()} has at least one non-null array
     * @param streamData  pre-converted stream data (null if {@code !hasStream})
     * @param lapData     pre-converted lap data
     * @return the activity ID summary from the DB
     */
    @Transactional
    UploadActivityUseCase.ActivitySummary persist(UUID userId,
                                                  ParsedActivity parsed,
                                                  String rawFilePath,
                                                  String formatStr,
                                                  boolean hasStream,
                                                  StreamData streamData,
                                                  List<LapData> lapData) {
        UUID activityId = activityPort.saveActivity(userId, parsed, rawFilePath, formatStr);

        if (hasStream) {
            streamPort.upsert(activityId, streamData);
        }

        if (!lapData.isEmpty()) {
            lapPort.replaceAll(activityId, lapData);
        }

        UploadActivityUseCase.ActivitySummary summary = activityPort.findById(activityId);

        eventPublisher.publishEvent(new com.coachfit.shared.domain.event.ActivityCreatedEvent(
                userId,
                activityId,
                summary.sport(),
                summary.name(),
                null,
                summary.startedAt(),
                summary.durationSeconds(),
                summary.distanceMeters() != null
                        ? java.math.BigDecimal.valueOf(summary.distanceMeters())
                        : null,
                parsed.tss()
        ));

        return summary;
    }
}
