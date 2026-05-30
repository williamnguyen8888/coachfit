package com.coachfit.dashboard.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: all read queries needed by the dashboard module.
 *
 * <p>Dashboard aggregates data across activities, calendar, wellness, health, and
 * training_load tables. This single port owns all dashboard reads and goes straight to
 * the DB — no cross-module service calls to keep the modulith boundary intact.
 */
public interface DashboardQueryPort {

    // ── Calendar ─────────────────────────────────────────────────────────────

    /** Returns the first planned calendar event for the given user on the given date. */
    Optional<PlannedWorkout> findTodayPlannedWorkout(UUID userId, LocalDate date);

    /** Returns total planned hours from calendar events in the given week. */
    double sumPlannedHoursInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd);

    /** Returns total completed hours (activities) for the user in the given week. */
    double sumCompletedHoursInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd);

    /** Returns count of completed activities in the given week. */
    int countCompletedSessionsInWeek(UUID userId, LocalDate weekStart, LocalDate weekEnd);

    // ── Activities ────────────────────────────────────────────────────────────

    /** Returns up to {@code limit} recent activities ordered by started_at DESC. */
    List<RecentActivityRow> findRecentActivities(UUID userId, int limit);

    /** Per-sport volume aggregation for a date range. */
    List<SportVolumeRow> aggregateSportVolume(UUID userId, LocalDate from, LocalDate to);

    /** Totals (distance + TSS) for a date range. */
    WeekTotals sumWeekTotals(UUID userId, LocalDate from, LocalDate to);

    // ── Training load ─────────────────────────────────────────────────────────

    /** Returns CTL/ATL/TSB for the given date and sport="all". */
    Optional<TrainingLoadRow> findTrainingLoadForDate(UUID userId, LocalDate date);

    /** Returns CTL/ATL/TSB trend rows for sport="all" in the given date range (ASC). */
    List<TrainingLoadRow> findTrainingLoadRange(UUID userId, LocalDate from, LocalDate to);

    // ── Health ────────────────────────────────────────────────────────────────

    /** Returns the most recent health daily summary for the user's primary source at or before asOf. */
    Optional<DailyHealthRow> findLatestDailyHealth(UUID userId, String source, LocalDate asOf);

    /** Returns the most recent sleep record for the user's primary source at or before asOf. */
    Optional<SleepHealthRow> findLatestSleep(UUID userId, String source, LocalDate asOf);

    /** Returns the user's full_name from the users table. */
    Optional<String> getUserFullName(UUID userId);

    /** Returns the user's primary health source from athlete_profiles. */
    Optional<String> findPrimaryHealthSource(UUID userId);

    // ── Wellness ──────────────────────────────────────────────────────────────

    /**
     * Returns the most recent wellness entry in the given lookback window (inclusive),
     * ordered by date DESC.
     */
    Optional<WellnessRow> findMostRecentWellness(UUID userId, LocalDate from, LocalDate to);

    // ── Data carriers ─────────────────────────────────────────────────────────

    record PlannedWorkout(UUID eventId, String title, String sport) {}

    record RecentActivityRow(
            UUID       id,
            String     sport,
            String     name,
            Instant    startedAt,
            int        durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgPower,
            BigDecimal tss
    ) {}

    record SportVolumeRow(
            String     sport,
            double     hours,
            int        sessions,
            BigDecimal distanceMeters,
            BigDecimal tss
    ) {}

    record WeekTotals(
            BigDecimal totalDistanceMeters,
            BigDecimal totalTss
    ) {}

    record TrainingLoadRow(
            LocalDate  date,
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb,
            BigDecimal dailyTss
    ) {}

    record DailyHealthRow(
            LocalDate  date,
            String     source,
            Integer    steps,
            Integer    restingHr,
            Integer    avgStress,
            Integer    maxStress,
            Integer    bodyBatteryHigh,
            BigDecimal avgSpo2
    ) {}

    record SleepHealthRow(
            LocalDate  date,
            String     source,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    lightSeconds,
            Integer    remSeconds,
            Integer    awakeSeconds,
            Integer    sleepScore,
            BigDecimal avgHrv,
            String     hrvStatus
    ) {}

    record WellnessRow(
            LocalDate date,
            Short     mood,
            Short     rpe
    ) {}
}
