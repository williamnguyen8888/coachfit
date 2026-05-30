package com.coachfit.sync.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Output port: read queries needed by the sync support surface.
 *
 * <p>Reads from {@code oauth_connections} (for status) and {@code sync_logs}
 * (for the paginated log). Both are read-only — writes remain in existing ports.
 */
public interface SyncSupportQueryPort {

    /** Returns all OAuth connections for the user (all providers). */
    List<ConnectionRow> findConnectionsByUserId(UUID userId);

    /** Returns paginated sync log entries for the user, ordered by {@code created_at DESC}. */
    List<SyncLogRow> findLogsByUserId(UUID userId, int page, int size);

    /** Returns the total number of sync log entries for the user. */
    long countLogsByUserId(UUID userId);

    // ── Row types ─────────────────────────────────────────────────────────────

    record ConnectionRow(
            String  provider,
            String  syncStatus,
            boolean pushEnabled,
            Instant lastSyncAt
    ) {}

    record SyncLogRow(
            UUID    id,
            String  provider,
            String  eventType,
            String  status,
            String  sourceId,
            UUID    activityId,
            String  errorMessage,
            Instant processedAt,
            Instant createdAt
    ) {}
}
