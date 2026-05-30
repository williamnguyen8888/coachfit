package com.coachfit.health.adapter.in;

import com.coachfit.health.application.port.in.HealthReadUseCase;
import com.coachfit.health.application.port.in.HealthReadUseCase.DailySummaryEntry;
import com.coachfit.health.application.port.in.HealthReadUseCase.SleepEntry;
import com.coachfit.health.application.port.in.HealthReadUseCase.TrendPoint;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for health data read endpoints.
 *
 * <pre>
 * GET /api/v1/health/daily?from=...&amp;to=...                    — daily summaries, all providers
 * GET /api/v1/health/sleep?from=...&amp;to=...                    — sleep records, all providers
 * GET /api/v1/health/trends?metric=resting_hr&amp;days=90         — metric trend, all providers
 * </pre>
 *
 * <p>All endpoints are <strong>provider-agnostic</strong>: data from Garmin, COROS,
 * Polar, Apple Health, etc. is returned uniformly. The {@code source} field in each
 * response item identifies where the data came from. Clients should not hardcode
 * provider-specific logic.
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthReadUseCase healthReadUseCase;

    public HealthController(HealthReadUseCase healthReadUseCase) {
        this.healthReadUseCase = healthReadUseCase;
    }

    // ── GET /health/daily ─────────────────────────────────────────────────────

    /**
     * Returns daily health summaries (steps, HR, stress, body battery, SpO2, VO2max...)
     * from all connected providers in the specified date range.
     * Ordered by date DESC, then by source alphabetically.
     * Defaults to the last 30 days if no range is specified.
     *
     * @param from ISO date lower bound (inclusive)
     * @param to   ISO date upper bound (inclusive)
     */
    @GetMapping("/daily")
    public ResponseEntity<List<DailySummaryResponse>> listDaily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<DailySummaryEntry> entries =
                healthReadUseCase.listDaily(principal.getUserId(), from, to);
        return ResponseEntity.ok(entries.stream().map(DailySummaryResponse::from).toList());
    }

    // ── GET /health/sleep ─────────────────────────────────────────────────────

    /**
     * Returns sleep records (stages, score, HRV, SpO2...) from all connected providers
     * in the specified date range. The {@code date} field is the wakeup date.
     * Ordered by date DESC. Defaults to the last 30 days if no range is specified.
     *
     * @param from ISO date lower bound (inclusive)
     * @param to   ISO date upper bound (inclusive)
     */
    @GetMapping("/sleep")
    public ResponseEntity<List<SleepResponse>> listSleep(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<SleepEntry> entries =
                healthReadUseCase.listSleep(principal.getUserId(), from, to);
        return ResponseEntity.ok(entries.stream().map(SleepResponse::from).toList());
    }

    // ── GET /health/trends ────────────────────────────────────────────────────

    /**
     * Returns a time-series of a single health metric from all providers for the given
     * number of past days. Useful for charting trends.
     *
     * <p>Supported metrics: {@code resting_hr}, {@code steps}, {@code vo2max},
     * {@code spo2}, {@code stress}, {@code sleep_score}, {@code hrv}, {@code weight}.
     *
     * @param metric metric name (required)
     * @param days   number of past days to include (default 90, max 365)
     */
    @GetMapping("/trends")
    public ResponseEntity<HealthTrendResponse> getTrends(
            @RequestParam String metric,
            @RequestParam(defaultValue = "90") int days,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<TrendPoint> points =
                healthReadUseCase.getTrend(principal.getUserId(), metric, days);
        return ResponseEntity.ok(new HealthTrendResponse(metric, days,
                points.stream().map(p -> new TrendPointDto(p.date(), p.source(), p.value())).toList()));
    }

    // ── Inner response DTOs ───────────────────────────────────────────────────

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DailySummaryResponse(
            LocalDate  date,
            String     source,
            Integer    steps,
            BigDecimal distanceMeters,
            Integer    caloriesTotal,
            Integer    caloriesActive,
            Integer    activeMinutes,
            Integer    intensityMinutes,
            Integer    floorsClimbed,
            Integer    restingHr,
            Integer    avgHr,
            Integer    maxHr,
            Integer    avgStress,
            Integer    maxStress,
            Integer    bodyBatteryHigh,
            Integer    bodyBatteryLow,
            BigDecimal avgSpo2,
            BigDecimal avgRespiration,
            BigDecimal vo2max,
            String     extra
    ) {
        static DailySummaryResponse from(DailySummaryEntry e) {
            return new DailySummaryResponse(
                    e.date(), e.source(), e.steps(), e.distanceMeters(),
                    e.caloriesTotal(), e.caloriesActive(), e.activeMinutes(),
                    e.intensityMinutes(), e.floorsClimbed(),
                    e.restingHr(), e.avgHr(), e.maxHr(),
                    e.avgStress(), e.maxStress(),
                    e.bodyBatteryHigh(), e.bodyBatteryLow(),
                    e.avgSpo2(), e.avgRespiration(), e.vo2max(), e.extra());
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SleepResponse(
            LocalDate  date,
            String     source,
            Instant    sleepStart,
            Instant    sleepEnd,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    lightSeconds,
            Integer    remSeconds,
            Integer    awakeSeconds,
            Integer    sleepScore,
            BigDecimal avgRespiration,
            BigDecimal avgSpo2,
            BigDecimal avgHrv,
            String     hrvStatus
    ) {
        static SleepResponse from(SleepEntry e) {
            return new SleepResponse(
                    e.date(), e.source(), e.sleepStart(), e.sleepEnd(),
                    e.durationSeconds(), e.deepSeconds(), e.lightSeconds(),
                    e.remSeconds(), e.awakeSeconds(),
                    e.sleepScore(), e.avgRespiration(), e.avgSpo2(),
                    e.avgHrv(), e.hrvStatus());
        }
    }

    public record HealthTrendResponse(
            String              metric,
            int                 days,
            List<TrendPointDto> points
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TrendPointDto(
            LocalDate  date,
            String     source,
            BigDecimal value
    ) {}
}
