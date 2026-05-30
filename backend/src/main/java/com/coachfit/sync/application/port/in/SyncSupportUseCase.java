package com.coachfit.sync.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: sync status, manual trigger, and log reads.
 *
 * <pre>
 * GET  /api/v1/sync/status                  — per-provider connection + sync state
 * POST /api/v1/sync/trigger/{provider}       — enqueue a manual sync (202 Accepted)
 * GET  /api/v1/sync/logs?page=0&size=20      — paginated sync log
 * </pre>
 */
public interface SyncSupportUseCase {

    SyncStatus   getStatus(UUID userId);

    void         triggerSync(UUID userId, String provider);

    SyncLogPage  getLogs(UUID userId, int page, int size);

    // ── Result types ─────────────────────────────────────────────────────────

    record SyncStatus(List<ProviderStatus> providers) {}

    record ProviderStatus(
            String  provider,
            String  syncStatus,       // active / error / disconnected
            boolean pushEnabled,
            Instant lastSyncAt        // nullable
    ) {}

    record SyncLogPage(
            List<SyncLogEntry> content,
            int  page,
            int  size,
            long totalElements
    ) {}

    record SyncLogEntry(
            UUID    id,
            String  provider,
            String  eventType,
            String  status,
            String  sourceId,
            UUID    activityId,       // nullable
            String  errorMessage,     // nullable
            Instant processedAt,      // nullable
            Instant createdAt
    ) {}
}
