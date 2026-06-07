package com.coachfit.athlete.application.port.out;

import com.coachfit.athlete.domain.model.SportZone;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
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

    /**
     * Returns the single most recent zone row for the given user, sport, and zone type.
     *
     * <p>Used by sync services (Strava, Garmin) to efficiently load just the
     * FTP or LTHR value they need for TSS/IF calculation, without loading all zones.
     *
     * @param userId   the authenticated user
     * @param sport    e.g. {@code "cycling"}, {@code "running"}, {@code "swimming"}
     * @param zoneType e.g. {@code "power"}, {@code "heart_rate"}, {@code "pace"}
     * @return the most recent matching zone, or empty if none configured
     */
    Optional<SportZone> findLatestBySportAndType(UUID userId, String sport, String zoneType);

    /**
     * Returns the zone row effective at or before the given date.
     *
     * <p>Used for historical accuracy: Time-in-Zone and TSS are computed
     * against the zone configuration that was active when the activity occurred.
     *
     * @param userId      the authenticated user
     * @param sport       e.g. {@code "cycling"}
     * @param zoneType    e.g. {@code "power"}, {@code "heart_rate"}, {@code "pace"}
     * @param activityDate the date of the activity
     * @return the zone config active on that date, or empty if none
     */
    Optional<SportZone> findBySportAndTypeAtDate(UUID userId, String sport, String zoneType,
                                                  LocalDate activityDate);

    /** Upserts on {@code (user_id, sport, zone_type, effective_date)} unique constraint. */
    SportZone upsert(SportZone zone);
}
