package com.coachfit.dashboard.adapter.in.dto;

import com.coachfit.dashboard.application.port.in.GetDashboardTodayUseCase.TodayDashboard;
import com.coachfit.dashboard.application.port.in.GetDashboardTodayUseCase.HealthSnapshot;
import com.coachfit.dashboard.application.port.in.GetDashboardTodayUseCase.SleepStages;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for GET /api/v1/dashboard/today.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardTodayResponse(
        String              greeting,
        TodayWorkoutDto     todayWorkout,
        HealthSnapshotDto   healthSnapshot,
        FitnessStatusDto    fitnessStatus,
        WeekProgressDto     weekProgress,
        LastWellnessDto     lastWellness,
        List<RecentActivityDto> recentActivities
) {
    public static DashboardTodayResponse from(TodayDashboard d, String fullName) {
        String greeting = buildGreeting(fullName);
        return new DashboardTodayResponse(
                greeting,
                d.todayWorkout() != null
                        ? new TodayWorkoutDto(d.todayWorkout().id(), d.todayWorkout().title(), d.todayWorkout().sport())
                        : null,
                d.healthSnapshot() != null ? HealthSnapshotDto.from(d.healthSnapshot()) : null,
                d.fitnessStatus()  != null
                        ? new FitnessStatusDto(d.fitnessStatus().ctl(), d.fitnessStatus().atl(),
                                               d.fitnessStatus().tsb(), d.fitnessStatus().trend())
                        : null,
                new WeekProgressDto(d.weekProgress().plannedHours(),
                        d.weekProgress().completedHours(), d.weekProgress().percentage()),
                d.lastWellness() != null
                        ? new LastWellnessDto(d.lastWellness().date(), d.lastWellness().mood(), d.lastWellness().rpe())
                        : null,
                d.recentActivities().stream()
                        .map(a -> new RecentActivityDto(a.id(), a.sport(), a.name(),
                                a.startedAt(), a.durationSeconds(), a.distanceMeters(),
                                a.avgPower(), a.tss()))
                        .toList()
        );
    }

    private static String buildGreeting(String fullName) {
        String name = (fullName != null && !fullName.isBlank())
                ? ", " + fullName.split(" ")[0] + "!"
                : "!";
        return "Hello" + name;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TodayWorkoutDto(UUID id, String title, String sport) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record HealthSnapshotDto(
            String     source,
            Integer    restingHr,
            Integer    sleepScore,
            BigDecimal sleepHours,
            SleepStagesDto sleepStages,
            BigDecimal hrv,
            String     hrvStatus,
            Integer    bodyBattery,
            Integer    stressAvg,
            Integer    steps,
            BigDecimal spo2
    ) {
        static HealthSnapshotDto from(HealthSnapshot s) {
            SleepStages stages = s.sleepStages();
            return new HealthSnapshotDto(
                    s.source(), s.restingHr(), s.sleepScore(), s.sleepHours(),
                    stages != null ? new SleepStagesDto(stages.deep(), stages.light(), stages.rem(), stages.awake()) : null,
                    s.hrv(), s.hrvStatus(), s.bodyBattery(), s.stressAvg(), s.steps(), s.spo2());
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SleepStagesDto(Integer deep, Integer light, Integer rem, Integer awake) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FitnessStatusDto(
            BigDecimal ctl, BigDecimal atl, BigDecimal tsb, String trend) {}

    public record WeekProgressDto(double plannedHours, double completedHours, int percentage) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record LastWellnessDto(LocalDate date, Short mood, Short rpe) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RecentActivityDto(
            UUID       id,
            String     sport,
            String     name,
            Instant    startedAt,
            int        durationSeconds,
            BigDecimal distanceMeters,
            Integer    avgPower,
            BigDecimal tss
    ) {}
}
