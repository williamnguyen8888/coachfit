package com.coachfit.athlete.application.port.out;

import com.coachfit.athlete.domain.model.OAuthConnection;

import java.util.List;
import java.util.UUID;

/**
 * Output port: {@code oauth_connections} read operations for the athlete module.
 *
 * <p>Only exposes non-sensitive fields — token columns are never surfaced here.
 */
public interface ConnectionsPersistencePort {

    /** Returns all connections where {@code sync_status != 'disconnected'}. */
    List<OAuthConnection> findActiveByUserId(UUID userId);

    boolean existsActive(UUID userId, String provider);

    /** Sets {@code sync_status = 'disconnected'} on the matching row. */
    void softDisconnect(UUID userId, String provider);
}
