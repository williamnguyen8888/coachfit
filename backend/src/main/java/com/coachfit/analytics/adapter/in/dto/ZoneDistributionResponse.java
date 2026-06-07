package com.coachfit.analytics.adapter.in.dto;

import com.coachfit.analytics.application.port.in.GetZoneDistributionUseCase.ZoneBand;
import com.coachfit.analytics.application.port.in.GetZoneDistributionUseCase.ZoneDistribution;

import java.time.LocalDate;
import java.util.List;

/**
 * JSON response body for {@code GET /api/v1/training-load/zones}.
 *
 * <pre>
 * {
 *   "from":         "2025-01-01",
 *   "to":           "2025-03-31",
 *   "sport":        null,
 *   "totalSeconds": 108000,
 *   "hrZones": [
 *     { "zone": 1, "label": "Z1 — Recovery", "seconds": 13500, "percentage": 12.5 }
 *   ],
 *   "powerZones": [
 *     { "zone": 1, "label": "Z1 — Active Recovery", "seconds": 7200, "percentage": 6.7 }
 *   ],
 *   "paceZones": [
 *     { "zone": 1, "label": "Z1 — Easy", "seconds": 5400, "percentage": 5.0 }
 *   ]
 * }
 * </pre>
 */
public record ZoneDistributionResponse(
        LocalDate    from,
        LocalDate    to,
        String       sport,
        long         totalSeconds,
        List<Band>   hrZones,
        List<Band>   powerZones,
        List<Band>   paceZones
) {

    public record Band(
            int    zone,
            String label,
            long   seconds,
            double percentage
    ) {}

    /**
     * Converts use-case output to the HTTP response body.
     */
    public static ZoneDistributionResponse from(ZoneDistribution dist) {
        return new ZoneDistributionResponse(
                dist.from(),
                dist.to(),
                dist.sport(),
                dist.totalSeconds(),
                toBands(dist.hrZones()),
                toBands(dist.powerZones()),
                toBands(dist.paceZones())
        );
    }

    private static List<Band> toBands(List<ZoneBand> bands) {
        return bands.stream()
                .map(b -> new Band(b.zone(), b.label(), b.seconds(), b.percentage()))
                .toList();
    }
}
