package com.coachfit.athlete.application.port.in;

import com.coachfit.athlete.domain.model.OAuthConnection;

import java.util.List;
import java.util.UUID;

/**
 * Use case: list all active OAuth connections for the current athlete.
 *
 * <p>Docs: {@code GET /api/v1/athlete/connections} — tier: free.
 * Returns only connections with {@code sync_status != 'disconnected'}.
 */
public interface GetConnectionsUseCase {

    List<OAuthConnection> getConnections(UUID userId);
}
