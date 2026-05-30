package com.coachfit.dashboard.application.service;

import com.coachfit.dashboard.application.port.in.GetDashboardTodayUseCase;
import com.coachfit.dashboard.application.port.in.GetFitnessTrendUseCase;
import com.coachfit.dashboard.application.port.in.GetWeeklySummaryUseCase;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort.DailyHealthRow;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort.SleepHealthRow;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort.TrainingLoadRow;
import com.coachfit.dashboard.application.port.out.DashboardQueryPort.WellnessRow;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service implementing all dashboard use cases.
 *
 * <p>Dashboard aggregates read-only data from multiple domains via a single
 * {@link DashboardQueryPort} — no cross-module service calls. This keeps
 * the module boundary intact (allowed dependencies: shared only).
 *
 * <p>All reads are non-transactional; eventual consistency is acceptable.
 */
@Service
public class DashboardService
        implements GetDashboardTodayUseCase,
                   GetWeeklySummaryUseCase,
                   GetFitnessTrendUseCase {

    /** Pro/Elite: max days for fitness trend. */
    public static final int MAX_TREND_DAYS = 365;

    private final DashboardQueryPort query;

    public DashboardService(DashboardQueryPort query) {
        this.query = query;
    }

    // ── GetDashboardTodayUseCase ──────────────────────────────────────────────

    @Override
    public TodayDashboard getToday(UUID userId) {
        LocalDate today     = LocalDate.now(ZoneOffset.UTC);
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd   = today.with(DayOfWeek.SUNDAY);

        // 1. Today's planned workout
        TodayWorkout todayWorkout = query.findTodayPlannedWorkout(userId, today)
                .map(pw -> new TodayWorkout(pw.eventId(), pw.title(), pw.sport()))
                .orElse(null);

        // 2. Health snapshot
        HealthSnapshot healthSnapshot = buildHealthSnapshot(userId, today);

        // 3. Fitness status
        FitnessStatus fitnessStatus = query.findTrainingLoadForDate(userId, today)
                .map(snap -> new FitnessStatus(snap.ctl(), snap.atl(), snap.tsb(),
                        deriveTrend(snap.tsb())))
                .orElse(null);

        // 4. Week progress
        double plannedHours   = query.sumPlannedHoursInWeek(userId, weekStart, weekEnd);
        double completedHours = query.sumCompletedHoursInWeek(userId, weekStart, weekEnd);
        int    percentage     = plannedHours > 0
                ? Math.min(100, (int) Math.round(completedHours / plannedHours * 100))
                : (completedHours > 0 ? 100 : 0);
        WeekProgress weekProgress = new WeekProgress(plannedHours, completedHours, percentage);

        // 5. Last wellness (look back 7 days)
        LastWellness lastWellness = query.findMostRecentWellness(userId, today.minusDays(6), today)
                .map(w -> new LastWellness(w.date(), w.mood(), w.rpe()))
                .orElse(null);

        // 6. Recent activities (last 5)
        List<RecentActivity> recent = query.findRecentActivities(userId, 5).stream()
                .map(r -> new RecentActivity(
                        r.id(), r.sport(), r.name(), r.startedAt(),
                        r.durationSeconds(), r.distanceMeters(), r.avgPower(), r.tss()))
                .toList();

        return new TodayDashboard("", todayWorkout, healthSnapshot,
                fitnessStatus, weekProgress, lastWellness, recent);
    }

    // ── GetWeeklySummaryUseCase ───────────────────────────────────────────────

    @Override
    public WeeklySummary getWeeklySummary(UUID userId) {
        LocalDate today     = LocalDate.now(ZoneOffset.UTC);
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd   = today.with(DayOfWeek.SUNDAY);

        double plannedHours   = query.sumPlannedHoursInWeek(userId, weekStart, weekEnd);
        double completedHours = query.sumCompletedHoursInWeek(userId, weekStart, weekEnd);
        int    sessions       = query.countCompletedSessionsInWeek(userId, weekStart, weekEnd);
        int    percentage     = plannedHours > 0
                ? Math.min(100, (int) Math.round(completedHours / plannedHours * 100))
                : (completedHours > 0 ? 100 : 0);

        DashboardQueryPort.WeekTotals totals = query.sumWeekTotals(userId, weekStart, weekEnd);
        List<SportVolume> bySport = query.aggregateSportVolume(userId, weekStart, weekEnd)
                .stream()
                .map(sv -> new SportVolume(sv.sport(), sv.hours(), sv.sessions(),
                        sv.distanceMeters(), sv.tss()))
                .toList();

        return new WeeklySummary(weekStart, weekEnd,
                plannedHours, completedHours, sessions, percentage,
                totals.totalTss(), totals.totalDistanceMeters(), bySport);
    }

    // ── GetFitnessTrendUseCase ────────────────────────────────────────────────

    @Override
    public FitnessTrend getFitnessTrend(UUID userId, int days) {
        int clampedDays = Math.min(Math.max(days, 1), MAX_TREND_DAYS);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from  = today.minusDays(clampedDays - 1L);

        List<TrendPoint> points = query.findTrainingLoadRange(userId, from, today).stream()
                .map(snap -> new TrendPoint(snap.date(), snap.ctl(), snap.atl(), snap.tsb(), snap.dailyTss()))
                .toList();

        return new FitnessTrend("all", points);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HealthSnapshot buildHealthSnapshot(UUID userId, LocalDate today) {
        String source = query.findPrimaryHealthSource(userId).orElse(null);
        if (source == null) return null;

        Optional<SleepHealthRow>   sleep = query.findLatestSleep(userId, source, today);
        Optional<DailyHealthRow>   daily = query.findLatestDailyHealth(userId, source, today);

        if (sleep.isEmpty() && daily.isEmpty()) return null;

        SleepHealthRow s = sleep.orElse(null);
        DailyHealthRow d = daily.orElse(null);

        SleepStages sleepStages = null;
        if (s != null && s.deepSeconds() != null) {
            sleepStages = new SleepStages(
                    toMin(s.deepSeconds()), toMin(s.lightSeconds()),
                    toMin(s.remSeconds()),  toMin(s.awakeSeconds()));
        }

        BigDecimal sleepHours = (s != null && s.durationSeconds() != null)
                ? BigDecimal.valueOf(s.durationSeconds() / 3600.0).setScale(1, RoundingMode.HALF_UP)
                : null;

        return new HealthSnapshot(
                source,
                d != null ? d.restingHr() : null,
                s != null ? s.sleepScore() : null,
                sleepHours,
                sleepStages,
                s != null ? s.avgHrv() : null,
                s != null ? s.hrvStatus() : null,
                d != null ? d.bodyBatteryHigh() : null,
                d != null ? d.avgStress() : null,
                d != null ? d.steps() : null,
                d != null ? d.avgSpo2() : null
        );
    }

    private static String deriveTrend(BigDecimal tsb) {
        if (tsb == null) return "stable";
        double v = tsb.doubleValue();
        if (v > 5)   return "improving";
        if (v < -10) return "declining";
        return "stable";
    }

    private static Integer toMin(Integer seconds) {
        return seconds != null ? seconds / 60 : null;
    }
}
