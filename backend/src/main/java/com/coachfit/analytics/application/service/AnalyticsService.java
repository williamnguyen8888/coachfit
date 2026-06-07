package com.coachfit.analytics.application.service;

import com.coachfit.analytics.application.port.in.GetPmcUseCase;
import com.coachfit.analytics.application.port.in.GetPowerCurveUseCase;
import com.coachfit.analytics.application.port.in.GetZoneDistributionUseCase;
import com.coachfit.analytics.application.port.out.AnalyticsQueryPort;
import com.coachfit.analytics.application.port.out.AnalyticsQueryPort.PowerBest;
import com.coachfit.analytics.application.port.out.AnalyticsQueryPort.ZoneBoundaryRow;
import com.coachfit.analytics.application.port.out.AnalyticsQueryPort.ZoneTimeData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service implementing the three Pro analytics use cases:
 * <ol>
 *   <li>{@link GetPmcUseCase} — PMC chart (CTL/ATL/TSB over time)</li>
 *   <li>{@link GetPowerCurveUseCase} — best mean-maximal power duration curve</li>
 *   <li>{@link GetZoneDistributionUseCase} — time-in-zone breakdown</li>
 * </ol>
 *
 * <p>Delegates all persistence to {@link AnalyticsQueryPort}. No cross-module
 * imports; data is fetched directly from the DB tables shared by all modules.
 */
@Service
public class AnalyticsService
        implements GetPmcUseCase,
                   GetPowerCurveUseCase,
                   GetZoneDistributionUseCase {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    /** Maximum lookback window for power curve queries (365 days). */
    private static final int MAX_POWER_CURVE_DAYS = 365;

    /** Default sport for power curve (power data is primarily cycling-based). */
    private static final String DEFAULT_POWER_SPORT = "cycling";

    /** Default sport for PMC when none is specified. */
    private static final String DEFAULT_PMC_SPORT = "all";

    private final AnalyticsQueryPort queryPort;

    public AnalyticsService(AnalyticsQueryPort queryPort) {
        this.queryPort = queryPort;
    }

    // ── GetPmcUseCase ─────────────────────────────────────────────────────────

    /**
     * Returns an ordered list of daily PMC points for the given date range.
     *
     * <p>Delegates directly to the persistence port. The {@code sport} parameter
     * defaults to {@code "all"} when not provided or when null/blank is supplied,
     * which maps to the cross-sport rollup row in the {@code training_load} table.
     */
    @Override
    public List<PmcPoint> getPmc(UUID userId, PmcQuery query) {
        String sport = resolvedPmcSport(query.sport());
        log.debug("PMC query: userId={} sport={} from={} to={}", userId, sport, query.from(), query.to());

        return queryPort.findPmcRange(userId, sport, query.from(), query.to())
                .stream()
                .map(row -> new PmcPoint(row.date(), row.ctl(), row.atl(), row.tsb(), row.dailyTss()))
                .toList();
    }

    // ── GetPowerCurveUseCase ──────────────────────────────────────────────────

    /**
     * Returns the power duration curve by querying the best mean-maximal power
     * at each of the {@link #STANDARD_DURATIONS} breakpoints.
     *
     * <p>The {@code days} parameter is capped at {@value #MAX_POWER_CURVE_DAYS}. Only
     * breakpoints where data exists are included in the returned list.
     */
    @Override
    public List<PowerCurvePoint> getPowerCurve(UUID userId, PowerCurveQuery query) {
        int days = Math.min(Math.max(query.days(), 1), MAX_POWER_CURVE_DAYS);
        String sport = (query.sport() == null || query.sport().isBlank())
                ? DEFAULT_POWER_SPORT : query.sport();

        Instant since = Instant.now()
                .atOffset(ZoneOffset.UTC)
                .minusDays(days)
                .toInstant();

        log.debug("Power curve query: userId={} sport={} days={} since={}", userId, sport, days, since);

        List<PowerCurvePoint> curve = new ArrayList<>();
        for (int durationSeconds : STANDARD_DURATIONS) {
            Optional<PowerBest> best = queryPort.findBestMeanMaximalPower(userId, since, durationSeconds);
            best.ifPresent(b ->
                    curve.add(new PowerCurvePoint(b.durationSeconds(), b.watts(), b.achievedAt())));
        }

        return curve;
    }

    // ── GetZoneDistributionUseCase ────────────────────────────────────────────

    /**
     * Returns time-in-zone distribution for the requested period.
     *
     * <p>Zone boundaries are loaded from the user's {@code sport_zones} config.
     * If no zones are configured for the given sport, empty lists are returned for
     * that metric type. The computation flow:
     * <ol>
     *   <li>Load HR and power zone boundaries from {@code sport_zones}</li>
     *   <li>Delegate raw second-by-second binning to the persistence port</li>
     *   <li>Compute percentages and assemble result</li>
     * </ol>
     */
    @Override
    public ZoneDistribution getZoneDistribution(UUID userId, ZoneQuery query) {
        String sport = (query.sport() == null || query.sport().isBlank()) ? null : query.sport();
        String boundaryLookupSport = sport != null ? sport : DEFAULT_POWER_SPORT;

        log.debug("Zone dist query: userId={} sport={} from={} to={}", userId, sport, query.from(), query.to());

        List<ZoneBoundaryRow> boundaries = queryPort.findZoneBoundaries(userId, boundaryLookupSport);
        List<ZoneBoundaryRow> hrBounds    = boundaries.stream()
                .filter(b -> b.hrMin() != null || b.hrMax() != null)
                .toList();
        List<ZoneBoundaryRow> powerBounds = boundaries.stream()
                .filter(b -> b.powerMin() != null || b.powerMax() != null)
                .toList();

        // Load pace zone boundaries separately from the pace zone_type
        List<ZoneBoundaryRow> paceBounds = queryPort.findPaceZoneBoundaries(userId, boundaryLookupSport);

        ZoneTimeData raw = queryPort.aggregateZoneTimes(
                userId, sport, query.from(), query.to(), hrBounds, powerBounds, paceBounds);

        long totalHrSeconds    = raw.hrZoneTotals().stream().mapToLong(z -> z.seconds()).sum();
        long totalPowerSeconds = raw.powerZoneTotals().stream().mapToLong(z -> z.seconds()).sum();
        long totalPaceSeconds  = raw.paceZoneTotals().stream().mapToLong(z -> z.seconds()).sum();
        long totalSeconds      = Math.max(Math.max(totalHrSeconds, totalPowerSeconds), totalPaceSeconds);

        List<ZoneBand> hrZones    = assembleBands(raw.hrZoneTotals(),    hrBounds,    totalHrSeconds);
        List<ZoneBand> powerZones = assembleBands(raw.powerZoneTotals(), powerBounds, totalPowerSeconds);
        List<ZoneBand> paceZones  = assembleBands(raw.paceZoneTotals(),  paceBounds,  totalPaceSeconds);

        return new ZoneDistribution(query.from(), query.to(), sport, totalSeconds, hrZones, powerZones, paceZones);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String resolvedPmcSport(String sport) {
        if (sport == null || sport.isBlank() || "all".equalsIgnoreCase(sport)) {
            return DEFAULT_PMC_SPORT;
        }
        return sport.toLowerCase();
    }

    /**
     * Assembles a list of {@link ZoneBand}s by joining raw zone totals with their
     * boundary definitions (for the label). Zones with no data (0 seconds) are
     * included so the client always gets a full set of zones.
     */
    private static List<ZoneBand> assembleBands(
            List<AnalyticsQueryPort.ZoneTotal> totals,
            List<ZoneBoundaryRow> boundaries,
            long totalSeconds) {

        if (boundaries.isEmpty()) return List.of();

        return boundaries.stream().map(boundary -> {
            long secs = totals.stream()
                    .filter(t -> t.zone() == boundary.zone())
                    .mapToLong(AnalyticsQueryPort.ZoneTotal::seconds)
                    .findFirst()
                    .orElse(0L);
            double pct = totalSeconds > 0 ? (double) secs / totalSeconds * 100.0 : 0.0;
            return new ZoneBand(boundary.zone(), boundary.label(), secs, Math.round(pct * 10.0) / 10.0);
        }).toList();
    }
}
