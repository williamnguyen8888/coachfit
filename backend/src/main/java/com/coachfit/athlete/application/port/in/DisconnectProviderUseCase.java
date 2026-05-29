package com.coachfit.athlete.application.port.in;

import java.util.UUID;

/**
 * Use case: disconnect (soft-delete) an OAuth provider for the current athlete.
 *
 * <p>Docs: {@code DELETE /api/v1/athlete/connections/{provider}} — tier: free.
 * Sets {@code sync_status = 'disconnected'} on the oauth_connections row.
 *
 * <p>Throws {@link com.coachfit.athlete.domain.exception.ProviderNotFoundException}
 * if no active connection exists for that provider.
 */
public interface DisconnectProviderUseCase {

    void disconnect(UUID userId, String provider);
}
