package com.coachfit.analytics.adapter.in;

import com.coachfit.analytics.adapter.in.dto.PmcResponse;
import com.coachfit.analytics.adapter.in.dto.PowerCurveResponse;
import com.coachfit.analytics.adapter.in.dto.ZoneDistributionResponse;
import com.coachfit.analytics.application.port.in.GetPmcUseCase;
import com.coachfit.analytics.application.port.in.GetPmcUseCase.PmcQuery;
import com.coachfit.analytics.application.port.in.GetPowerCurveUseCase;
import com.coachfit.analytics.application.port.in.GetPowerCurveUseCase.PowerCurveQuery;
import com.coachfit.analytics.application.port.in.GetZoneDistributionUseCase;
import com.coachfit.analytics.application.port.in.GetZoneDistributionUseCase.ZoneQuery;
import com.coachfit.shared.adapter.in.security.featuregate.RequiresTier;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * REST controller for Pro-tier analytics endpoints.
 *
 * <pre>
 * GET /api/v1/training-load/pmc?from=...&to=...&sport=...        — PMC chart (CTL/ATL/TSB)
 * GET /api/v1/training-load/power-curve?days=90&sport=cycling    — power duration curve
 * GET /api/v1/training-load/zones?from=...&to=...&sport=...      — time-in-zone distribution
 * </pre>
 *
 * <p>All endpoints are gated behind the {@code pro} subscription tier via
 * {@link RequiresTier}. Requests from {@code free} tier users will be rejected
 * with HTTP 403 by the {@code FeatureGateFilter} before reaching these methods.
 *
 * <p>Authentication is enforced by the JWT filter chain; the authenticated user's
 * UUID is injected via {@link UserPrincipal}.
 */
@RestController
@RequestMapping("/api/v1/training-load")
public class TrainingLoadController {

    /** Maximum look-back for the power curve (365 days). */
    private static final int MAX_POWER_CURVE_DAYS = 365;

    /** Default look-back for the power curve (90 days). */
    private static final int DEFAULT_POWER_CURVE_DAYS = 90;

    private final GetPmcUseCase              pmcUseCase;
    private final GetPowerCurveUseCase       powerCurveUseCase;
    private final GetZoneDistributionUseCase zoneDistributionUseCase;

    public TrainingLoadController(GetPmcUseCase pmcUseCase,
                                  GetPowerCurveUseCase powerCurveUseCase,
                                  GetZoneDistributionUseCase zoneDistributionUseCase) {
        this.pmcUseCase              = pmcUseCase;
        this.powerCurveUseCase       = powerCurveUseCase;
        this.zoneDistributionUseCase = zoneDistributionUseCase;
    }

    // ── GET /training-load/pmc ────────────────────────────────────────────────

    /**
     * Returns a Performance Management Chart (PMC) data series for the given
     * date range and sport.
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code from} — start date (ISO, e.g. "2025-01-01"); defaults to 90 days ago</li>
     *   <li>{@code to}   — end date (ISO); defaults to today</li>
     *   <li>{@code sport} — sport filter (e.g. "cycling"); omit for cross-sport rollup</li>
     * </ul>
     */
    @GetMapping("/pmc")
    @RequiresTier("pro")
    public ResponseEntity<PmcResponse> getPmc(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false) String sport,

            @AuthenticationPrincipal UserPrincipal principal) {

        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(90);

        PmcQuery query = new PmcQuery(effectiveFrom, effectiveTo, sport);
        String resolvedSport = (sport == null || sport.isBlank()) ? "all" : sport;

        return ResponseEntity.ok(
                PmcResponse.from(
                        resolvedSport,
                        effectiveFrom,
                        effectiveTo,
                        pmcUseCase.getPmc(principal.getUserId(), query)));
    }

    // ── GET /training-load/power-curve ────────────────────────────────────────

    /**
     * Returns the best mean-maximal power curve for the given look-back window.
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code days}  — look-back in days (1–365, default 90)</li>
     *   <li>{@code sport} — sport filter; defaults to "cycling"</li>
     * </ul>
     *
     * <p>Only duration breakpoints with actual data are included in the response.
     * Missing breakpoints indicate insufficient riding data at that duration.
     */
    @GetMapping("/power-curve")
    @RequiresTier("pro")
    public ResponseEntity<PowerCurveResponse> getPowerCurve(
            @RequestParam(defaultValue = "90") int days,
            @RequestParam(required = false)    String sport,
            @AuthenticationPrincipal           UserPrincipal principal) {

        int effectiveDays = Math.min(Math.max(days, 1), MAX_POWER_CURVE_DAYS);
        String effectiveSport = (sport == null || sport.isBlank()) ? "cycling" : sport;

        PowerCurveQuery query = new PowerCurveQuery(effectiveDays, effectiveSport);

        return ResponseEntity.ok(
                PowerCurveResponse.from(
                        effectiveSport,
                        effectiveDays,
                        powerCurveUseCase.getPowerCurve(principal.getUserId(), query)));
    }

    // ── GET /training-load/zones ──────────────────────────────────────────────

    /**
     * Returns the time-in-zone distribution for the given date range and sport.
     *
     * <p>Both heart-rate and power zones are returned in a single response.
     * Empty arrays are returned for zone types where either no zones are configured
     * or no stream data exists for the requested period.
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code from}  — start date (ISO); defaults to 90 days ago</li>
     *   <li>{@code to}    — end date (ISO); defaults to today</li>
     *   <li>{@code sport} — sport filter; omit for all sports</li>
     * </ul>
     */
    @GetMapping("/zones")
    @RequiresTier("pro")
    public ResponseEntity<ZoneDistributionResponse> getZones(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false) String sport,

            @AuthenticationPrincipal UserPrincipal principal) {

        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(90);

        ZoneQuery query = new ZoneQuery(effectiveFrom, effectiveTo, sport);

        return ResponseEntity.ok(
                ZoneDistributionResponse.from(
                        zoneDistributionUseCase.getZoneDistribution(principal.getUserId(), query)));
    }
}
