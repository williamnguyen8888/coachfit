package com.coachfit.consent.application.port.in;

import java.util.List;
import java.util.UUID;

/**
 * Input port for consent management (docs/11-privacy-compliance.md §5. Quản lý đồng ý).
 *
 * <p>Called by:
 * <ul>
 *   <li>Auth module — on registration (health_data_processing consent)</li>
 *   <li>Auth module — on OAuth connect (provider-specific sync consent)</li>
 *   <li>Account module — for GET /account/privacy to list the consent log</li>
 * </ul>
 */
public interface ConsentUseCase {

    /**
     * Records a consent event (grant or withdrawal).
     *
     * @param userId    the user granting or withdrawing consent
     * @param type      consent type string — e.g. {@code "health_data_processing"},
     *                  {@code "strava_sync"}, {@code "garmin_sync"}
     * @param granted   {@code true} if granting; {@code false} if withdrawing
     * @param ipAddress request IP address (IPv4 or IPv6), may be null
     * @param userAgent request User-Agent header, may be null
     */
    void recordConsent(UUID userId, String type, boolean granted,
                       String ipAddress, String userAgent);

    /**
     * Returns the full consent log for a user, ordered by most recent first.
     * Used by GET /api/v1/account/privacy.
     */
    List<ConsentRecord> getConsentLog(UUID userId);

    // ── Domain record ─────────────────────────────────────────────────────────

    record ConsentRecord(
            UUID    id,
            String  type,
            boolean granted,
            java.time.Instant grantedAt,
            String  ipAddress,
            String  version
    ) {}
}
