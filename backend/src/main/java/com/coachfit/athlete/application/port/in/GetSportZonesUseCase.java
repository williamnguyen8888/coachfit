package com.coachfit.athlete.application.port.in;

import com.coachfit.athlete.domain.model.SportZone;

import java.util.List;
import java.util.UUID;

/**
 * Use case: list all sport zones for the current athlete.
 *
 * <p>Docs: {@code GET /api/v1/athlete/zones} — tier: free.
 * Returns the most recent zone row per {@code (sport, zoneType)} combination.
 */
public interface GetSportZonesUseCase {

    List<SportZone> getZones(UUID userId);
}
