package com.coachfit.dashboard.adapter.in;

import com.coachfit.dashboard.adapter.in.dto.DashboardTodayResponse;
import com.coachfit.dashboard.adapter.in.dto.FitnessTrendResponse;
import com.coachfit.dashboard.adapter.in.dto.WeeklySummaryResponse;
import com.coachfit.dashboard.application.port.in.GetDashboardTodayUseCase;
import com.coachfit.dashboard.application.port.in.GetFitnessTrendUseCase;
import com.coachfit.dashboard.application.port.in.GetWeeklySummaryUseCase;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort;
import com.coachfit.dashboard.application.service.DashboardService;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for dashboard endpoints.
 *
 * <pre>
 * GET /api/v1/dashboard/today              — morning briefing
 * GET /api/v1/dashboard/weekly-summary     — weekly volume stats
 * GET /api/v1/dashboard/fitness-trend      — CTL/ATL/TSB sparkline
 * </pre>
 *
 * <p>Authentication is enforced by the JWT filter chain. User identity is
 * injected via {@link UserPrincipal}.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final GetDashboardTodayUseCase todayUseCase;
    private final GetWeeklySummaryUseCase  weeklySummaryUseCase;
    private final GetFitnessTrendUseCase   fitnessTrendUseCase;
    private final DashboardQueryPort       dashboardQuery;

    public DashboardController(GetDashboardTodayUseCase todayUseCase,
                               GetWeeklySummaryUseCase weeklySummaryUseCase,
                               GetFitnessTrendUseCase fitnessTrendUseCase,
                               DashboardQueryPort dashboardQuery) {
        this.todayUseCase         = todayUseCase;
        this.weeklySummaryUseCase = weeklySummaryUseCase;
        this.fitnessTrendUseCase  = fitnessTrendUseCase;
        this.dashboardQuery       = dashboardQuery;
    }

    // ── GET /dashboard/today ──────────────────────────────────────────────────

    /**
     * Returns the morning briefing dashboard: today's workout, health snapshot,
     * fitness status, week progress, last wellness, and recent activities.
     */
    @GetMapping("/today")
    public ResponseEntity<DashboardTodayResponse> getToday(
            @AuthenticationPrincipal UserPrincipal principal) {

        String fullName = dashboardQuery.getUserFullName(principal.getUserId()).orElse(null);
        GetDashboardTodayUseCase.TodayDashboard data = todayUseCase.getToday(principal.getUserId());
        return ResponseEntity.ok(DashboardTodayResponse.from(data, fullName));
    }

    // ── GET /dashboard/weekly-summary ─────────────────────────────────────────

    /**
     * Returns the current ISO week's planned vs. completed hours and per-sport breakdown.
     */
    @GetMapping("/weekly-summary")
    public ResponseEntity<WeeklySummaryResponse> getWeeklySummary(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                WeeklySummaryResponse.from(
                        weeklySummaryUseCase.getWeeklySummary(principal.getUserId())));
    }

    // ── GET /dashboard/fitness-trend ──────────────────────────────────────────

    /**
     * Returns the CTL/ATL/TSB sparkline for the given number of days.
     *
     * @param days number of days to include (default 90, max 365)
     */
    @GetMapping("/fitness-trend")
    public ResponseEntity<FitnessTrendResponse> getFitnessTrend(
            @RequestParam(defaultValue = "90") int days,
            @AuthenticationPrincipal UserPrincipal principal) {

        int effectiveDays = Math.min(days, DashboardService.MAX_TREND_DAYS);

        return ResponseEntity.ok(
                FitnessTrendResponse.from(
                        fitnessTrendUseCase.getFitnessTrend(principal.getUserId(), effectiveDays)));
    }
}
