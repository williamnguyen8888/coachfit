package com.coachfit.athlete.application.port.out;

import com.coachfit.athlete.domain.model.SportZone;

import java.util.List;
import java.util.UUID;

/**
 * Output port: {@code sport_zones} persistence operations.
 */
public interface SportZonePersistencePort {

    /**
     * Returns the most recent zone row per {@code (sport, zone_type)} combination.
     * Ordered by {@code (sport ASC, zone_type ASC)}.
     */
    List<SportZone> findLatestByUserId(UUID userId);

    /** Upserts on {@code (user_id, sport, zone_type, effective_date)} unique constraint. */
    SportZone upsert(SportZone zone);
}
