package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.DeleteActivityUseCase;
import com.coachfit.activity.application.port.in.DownloadActivityUseCase;
import com.coachfit.activity.application.port.in.GetActivityLapsUseCase;
import com.coachfit.activity.application.port.in.GetActivityStreamsUseCase;
import com.coachfit.activity.application.port.in.GetActivityUseCase;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase;
import com.coachfit.activity.application.port.in.UpdateActivityUseCase;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort;
import com.coachfit.activity.application.port.out.ActivityLapPersistencePort.LapData;
import com.coachfit.activity.application.port.out.ActivityPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStoragePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort;
import com.coachfit.activity.application.port.out.ActivityStreamPersistencePort.StreamData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Application service implementing the activity read / update / delete use cases.
 *
 * <p>Ownership is always enforced: every query / update includes {@code user_id = :userId}
 * so a user can never access another user's activities.
 *
 * <p>Separation of concerns:
 * <ul>
 *   <li>Read queries (list, get, streams, laps, download) — no transaction needed.</li>
 *   <li>Writes (update, delete) — transactional.</li>
 * </ul>
 */
@Service
public class ActivityQueryCommandService
        implements ListActivitiesUseCase,
                   GetActivityUseCase,
                   GetActivityStreamsUseCase,
                   GetActivityLapsUseCase,
                   UpdateActivityUseCase,
                   DeleteActivityUseCase,
                   DownloadActivityUseCase {

    private static final Logger log = LoggerFactory.getLogger(ActivityQueryCommandService.class);

    /** Pre-signed URL lifetime: 15 minutes (900 seconds). */
    private static final int PRESIGNED_URL_EXPIRY_SECONDS = 900;

    private final ActivityPersistencePort       activityPort;
    private final ActivityStreamPersistencePort streamPort;
    private final ActivityLapPersistencePort    lapPort;
    private final ActivityStoragePort           storagePort;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public ActivityQueryCommandService(ActivityPersistencePort activityPort,
                                       ActivityStreamPersistencePort streamPort,
                                       ActivityLapPersistencePort lapPort,
                                       ActivityStoragePort storagePort,
                                       org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.activityPort = activityPort;
        this.streamPort   = streamPort;
        this.lapPort      = lapPort;
        this.storagePort  = storagePort;
        this.eventPublisher = eventPublisher;
    }

    // ── ListActivitiesUseCase ─────────────────────────────────────────────────

    @Override
    public ActivityPage list(UUID userId, ActivityQuery query) {
        long total = activityPort.count(userId, query.sport(), query.source(),
                query.from(), query.to());
        int totalPages = query.size() > 0
                ? (int) Math.ceil((double) total / query.size()) : 0;

        List<ActivityListItem> content = activityPort.list(
                userId, query.sport(), query.source(), query.from(), query.to(),
                query.page(), query.size(), query.sortField(), query.sortDir());

        return new ActivityPage(content, query.page(), query.size(), total, totalPages);
    }

    // ── GetActivityUseCase ────────────────────────────────────────────────────

    @Override
    public ActivityDetail get(UUID userId, UUID activityId) {
        return activityPort.findDetailById(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Activity not found"));
    }

    // ── GetActivityStreamsUseCase ──────────────────────────────────────────────

    @Override
    public ActivityStreams getStreams(UUID userId, UUID activityId) {
        // Verify ownership / existence first
        activityPort.findDetailById(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Activity not found"));

        StreamData data = streamPort.findByActivityId(activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No stream data available for this activity"));

        return new ActivityStreams(
                activityId,
                data.timestamps(),
                data.heartRate(),
                data.power(),
                data.cadence(),
                data.speed(),
                data.altitude(),
                data.latitude(),
                data.longitude(),
                data.distance(),
                data.temperature(),
                data.grade()
        );
    }

    // ── GetActivityLapsUseCase ────────────────────────────────────────────────

    @Override
    public List<LapItem> getLaps(UUID userId, UUID activityId) {
        // Verify ownership / existence first
        activityPort.findDetailById(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Activity not found"));

        return lapPort.findByActivityId(activityId).stream()
                .map(l -> new LapItem(
                        l.lapIndex(), l.startTime(), l.durationSeconds(),
                        l.distanceMeters(), l.avgHeartRate(), l.maxHeartRate(),
                        l.avgPower(), l.maxPower(), l.normalizedPower(),
                        l.avgCadence(), l.avgPace(),
                        l.maxSpeed(), l.elevationGain(), l.elevationDescent(),
                        l.lapTrigger()))
                .toList();
    }

    // ── UpdateActivityUseCase ─────────────────────────────────────────────────

    @Override
    @Transactional
    public void update(UUID userId, UUID activityId, UpdateCommand command) {
        boolean found = activityPort.updateUserFields(
                activityId, userId,
                command.name(), command.description(), command.gearId());
        if (!found) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found");
        }
        log.debug("Activity updated: id={} user={}", activityId, userId);
    }

    // ── DeleteActivityUseCase ─────────────────────────────────────────────────

    @Override
    @Transactional
    public void delete(UUID userId, UUID activityId) {
        // Verify ownership before soft-delete and capture sport/startedAt for PMC recalc
        ActivityDetail detail = activityPort.findDetailById(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Activity not found"));

        activityPort.softDelete(activityId);
        log.info("Activity soft-deleted: id={} user={}", activityId, userId);

        eventPublisher.publishEvent(new com.coachfit.shared.domain.event.ActivityDeletedEvent(
                userId, activityId, detail.sport(), detail.startedAt()));
    }

    // ── DownloadActivityUseCase ───────────────────────────────────────────────

    @Override
    public DownloadInfo getDownloadUrl(UUID userId, UUID activityId) {
        ActivityDetail detail = activityPort.findDetailById(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Activity not found"));

        // Raw file path is stored in raw_file_path; access via a separate query if needed.
        // We fetch the raw_file_path via a lightweight port method.
        String rawFilePath = activityPort.findRawFilePath(userId, activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No downloadable file for this activity"));

        String url = storagePort.generatePresignedDownloadUrl(rawFilePath, PRESIGNED_URL_EXPIRY_SECONDS);

        return new DownloadInfo(url, detail.rawFileFormat(), PRESIGNED_URL_EXPIRY_SECONDS);
    }
}
