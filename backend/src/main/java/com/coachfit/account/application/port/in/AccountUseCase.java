package com.coachfit.account.application.port.in;

import java.time.Instant;
import java.util.UUID;

/**
 * Input port for account-level GDPR operations.
 *
 * <p>References: docs/11-privacy-compliance.md §3 (User Rights), §8 (Deletion Implementation).
 */
public interface AccountUseCase {

    /**
     * Enqueues an async data export job (GDPR Art. 15 / Art. 20).
     * Rate-limited to 1 request per user per 24 hours via Redis.
     *
     * @return the export job record with status PENDING
     * @throws ExportRateLimitException if the user already requested an export today
     */
    ExportJobResult requestExport(UUID userId);

    /**
     * Soft-deletes the account (GDPR Art. 17).
     * <ol>
     *   <li>Sets {@code users.deleted_at = now()}</li>
     *   <li>Revokes all refresh tokens</li>
     *   <li>Soft-revokes all OAuth connections ({@code sync_status = 'revoked'})</li>
     * </ol>
     * Hard delete happens after the 30-day grace period via scheduled job.
     *
     * @return the date when hard delete will occur
     */
    Instant deleteAccount(UUID userId);

    /**
     * Cancels a pending deletion (within the 30-day grace period).
     * Clears {@code users.deleted_at}.
     *
     * @return {@code true} if cancelled; {@code false} if no pending deletion found
     */
    boolean cancelDeletion(UUID userId);

    /**
     * Toggles the {@code processing_restricted} flag (GDPR Art. 18).
     *
     * @param restricted {@code true} to restrict; {@code false} to re-enable
     * @return the updated restriction state
     */
    boolean setProcessingRestriction(UUID userId, boolean restricted);

    /**
     * Returns current privacy settings and the consent log for the user.
     */
    PrivacyStatus getPrivacyStatus(UUID userId);

    // ── Domain records ────────────────────────────────────────────────────────

    record ExportJobResult(UUID jobId, String status, Instant createdAt, Instant expiresAt) {}

    record PrivacyStatus(
            boolean processingRestricted,
            Instant deletedAt,           // null if not pending deletion
            java.util.List<ConsentEntry> consents
    ) {}

    record ConsentEntry(
            String  type,
            boolean granted,
            Instant grantedAt,
            String  ipAddress,
            String  version
    ) {}

    /** Thrown when the user has already requested an export today. */
    class ExportRateLimitException extends RuntimeException {
        public ExportRateLimitException() {
            super("Data export can only be requested once per 24 hours.");
        }
    }
}
