package com.coachfit.account.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port for export job persistence (docs/11-privacy-compliance.md §3.1).
 *
 * <p>Backed by the {@code export_jobs} table (V023 migration).
 */
public interface ExportJobPersistencePort {

    /** Creates a new PENDING export job and returns its ID. */
    UUID createJob(UUID userId);

    /** Returns the most recently created export job for the user, if any. */
    Optional<ExportJobRow> findLatestForUser(UUID userId);

    /** Updates job status and optionally sets file_url and expires_at. */
    void updateJob(UUID jobId, String status, String fileUrl, Instant expiresAt);

    record ExportJobRow(
            UUID    id,
            UUID    userId,
            String  status,
            String  fileUrl,
            Instant createdAt,
            Instant expiresAt
    ) {}
}
