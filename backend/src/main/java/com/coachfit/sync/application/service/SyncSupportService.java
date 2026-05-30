package com.coachfit.sync.application.service;

import com.coachfit.sync.application.port.in.SyncSupportUseCase;
import com.coachfit.sync.application.port.out.GarminJobQueuePort;
import com.coachfit.sync.application.port.out.StravaJobQueuePort;
import com.coachfit.sync.application.port.out.SyncSupportQueryPort;
import com.coachfit.sync.application.port.out.SyncSupportQueryPort.ConnectionRow;
import com.coachfit.sync.application.port.out.SyncSupportQueryPort.SyncLogRow;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Application service implementing {@link SyncSupportUseCase}.
 *
 * <h3>Trigger logic</h3>
 * <ul>
 *   <li>Strava — enqueues a synthetic {@code manual_sync} job via {@link StravaJobQueuePort}</li>
 *   <li>Garmin  — enqueues a synthetic {@code garmin_manual_sync} job via {@link GarminJobQueuePort}</li>
 *   <li>Unknown or disconnected provider → 400 Bad Request</li>
 * </ul>
 */
@Service
public class SyncSupportService implements SyncSupportUseCase {

    private static final Set<String> KNOWN_PROVIDERS = Set.of("strava", "garmin");

    private final SyncSupportQueryPort queryPort;
    private final StravaJobQueuePort   stravaQueue;
    private final GarminJobQueuePort   garminQueue;

    public SyncSupportService(SyncSupportQueryPort queryPort,
                              StravaJobQueuePort stravaQueue,
                              GarminJobQueuePort garminQueue) {
        this.queryPort   = queryPort;
        this.stravaQueue = stravaQueue;
        this.garminQueue = garminQueue;
    }

    // ── GET /sync/status ─────────────────────────────────────────────────────

    @Override
    public SyncStatus getStatus(UUID userId) {
        List<ProviderStatus> providers = queryPort.findConnectionsByUserId(userId).stream()
                .map(row -> new ProviderStatus(
                        row.provider(),
                        row.syncStatus(),
                        row.pushEnabled(),
                        row.lastSyncAt()))
                .toList();
        return new SyncStatus(providers);
    }

    // ── POST /sync/trigger/{provider} ────────────────────────────────────────

    @Override
    public void triggerSync(UUID userId, String provider) {
        String normalised = provider.toLowerCase();

        if (!KNOWN_PROVIDERS.contains(normalised)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown provider: " + provider + ". Supported: strava, garmin.");
        }

        // Verify the user has an active connection for this provider.
        boolean connected = queryPort.findConnectionsByUserId(userId).stream()
                .anyMatch(c -> c.provider().equals(normalised)
                        && !"disconnected".equals(c.syncStatus()));
        if (!connected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No active " + provider + " connection found. Connect it first.");
        }

        switch (normalised) {
            case "strava" ->
                // Enqueue a manual sync — the Strava worker will pull the full activity list.
                stravaQueue.enqueue(userId, "manual_trigger", "manual_sync", 0);
            case "garmin" ->
                // Garmin is push-based; a manual trigger signals the worker to request re-push.
                garminQueue.enqueue(userId, "garmin_manual_sync", "{}");
        }
    }

    // ── GET /sync/logs ────────────────────────────────────────────────────────

    @Override
    public SyncLogPage getLogs(UUID userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);

        List<SyncLogEntry> content = queryPort.findLogsByUserId(userId, safePage, safeSize)
                .stream()
                .map(row -> new SyncLogEntry(
                        row.id(), row.provider(), row.eventType(), row.status(),
                        row.sourceId(), row.activityId(), row.errorMessage(),
                        row.processedAt(), row.createdAt()))
                .toList();

        long total = queryPort.countLogsByUserId(userId);

        return new SyncLogPage(content, safePage, safeSize, total);
    }
}
