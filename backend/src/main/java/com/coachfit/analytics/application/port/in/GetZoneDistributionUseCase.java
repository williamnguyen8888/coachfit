package com.coachfit.analytics.application.port.in;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: zone distribution analytics.
 *
 * <p>Returns aggregated time-in-zone breakdowns for both heart rate and power
 * over a given date range. Zone boundaries are derived from the athlete's
 * stored sport zones (see {@code sport_zones} table). Activities without stream
 * data are excluded.
 *
 * <p>Endpoint: {@code GET /api/v1/training-load/zones?from=...&to=...&sport=...}
 *
 * <p>Tier: 💎 Pro
 */
public interface GetZoneDistributionUseCase {

    /**
     * Returns time-in-zone distribution for the requested period.
     *
     * @param userId the authenticated user
     * @param query  date range and optional sport filter
     * @return zone distribution result; {@code hrZones} or {@code powerZones} may be empty
     *         if no relevant stream data exists
     */
    ZoneDistribution getZoneDistribution(UUID userId, ZoneQuery query);

    /**
     * Query parameters for zone distribution.
     *
     * @param from   start date (inclusive)
     * @param to     end date (inclusive)
     * @param sport  optional sport filter; null means all sports
     */
    record ZoneQuery(LocalDate from, LocalDate to, String sport) {}

    /**
     * A single zone band.
     *
     * @param zone        zone number (1-based)
     * @param label       human-readable label (e.g. "Z1 — Recovery")
     * @param seconds     total seconds spent in this zone
     * @param percentage  fraction of total training time in this zone (0–100)
     */
    record ZoneBand(int zone, String label, long seconds, double percentage) {}

    /**
     * Aggregated zone distribution result.
     *
     * @param from        start of the analysis period
     * @param to          end of the analysis period
     * @param sport       sport filter applied (null = all sports)
     * @param totalSeconds total seconds of analysed stream data (denominator for percentages)
     * @param hrZones     time-in-heart-rate-zone breakdown (empty if no HR stream data)
     * @param powerZones  time-in-power-zone breakdown (empty if no power stream data)
     */
    record ZoneDistribution(
            LocalDate       from,
            LocalDate       to,
            String          sport,
            long            totalSeconds,
            List<ZoneBand>  hrZones,
            List<ZoneBand>  powerZones
    ) {}
}
