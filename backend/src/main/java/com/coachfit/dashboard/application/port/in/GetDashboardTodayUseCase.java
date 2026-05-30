package com.coachfit.dashboard.application.port.in;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: GET /api/v1/dashboard/today — morning briefing card.
 *
 * <p>Aggregates fitness status, today's planned workout, health snapshot,
 * week progress, last wellness entry, and recent activities into one response.
 */
public interface GetDashboardTodayUseCase {

    TodayDashboard getToday(UUID userId);

    // ── Result types ─────────────────────────────────────────────────────────

    record TodayDashboard(
            String          greeting,
            TodayWorkout    todayWorkout,      // nullable — no workout planned today
            HealthSnapshot  healthSnapshot,    // nullable — no health data
            FitnessStatus   fitnessStatus,     // nullable — no training load data
            WeekProgress    weekProgress,
            LastWellness    lastWellness,      // nullable — no wellness logged
            List<RecentActivity> recentActivities
    ) {}

    record TodayWorkout(
            UUID   id,
            String title,
            String sport
    ) {}

    record HealthSnapshot(
            String     source,
            Integer    restingHr,
            Integer    sleepScore,
            BigDecimal sleepHours,
            SleepStages sleepStages,       // nullable
            BigDecimal hrv,
            String     hrvStatus,
            Integer    bodyBattery,
            Integer    stressAvg,
            Integer    steps,
            BigDecimal spo2
    ) {}

    record SleepStages(
            Integer deep,
            Integer light,
            Integer rem,
            Integer awake
    ) {}

    record FitnessStatus(
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb,
            String     trend   // "improving" | "declining" | "stable"
    ) {}

    record WeekProgress(
            double plannedHours,
            double completedHours,
            int    percentage
    ) {}

    record LastWellness(
            LocalDate date,
            Short     mood,
            Short     rpe
    ) {}

    record RecentActivity(
            UUID       id,
            String     sport,
            String     name,
            java.time.Instant startedAt,
            int        durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgPower,
            BigDecimal tss
    ) {}
}
