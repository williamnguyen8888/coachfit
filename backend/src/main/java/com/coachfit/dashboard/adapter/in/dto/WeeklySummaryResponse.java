package com.coachfit.dashboard.adapter.in.dto;

import com.coachfit.dashboard.application.port.in.GetWeeklySummaryUseCase.WeeklySummary;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for GET /api/v1/dashboard/weekly-summary.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WeeklySummaryResponse(
        LocalDate          weekStart,
        LocalDate          weekEnd,
        double             plannedHours,
        double             completedHours,
        int                completedSessions,
        int                percentage,
        BigDecimal         totalTss,
        BigDecimal         totalDistanceMeters,
        List<SportVolumeDto> bySport
) {
    public static WeeklySummaryResponse from(WeeklySummary s) {
        return new WeeklySummaryResponse(
                s.weekStart(), s.weekEnd(),
                s.plannedHours(), s.completedHours(),
                s.completedSessions(), s.percentage(),
                s.totalTss(), s.totalDistanceMeters(),
                s.bySport().stream()
                        .map(sv -> new SportVolumeDto(sv.sport(), sv.hours(), sv.sessions(),
                                sv.distanceMeters(), sv.tss()))
                        .toList());
    }

    public record SportVolumeDto(
            String     sport,
            double     hours,
            int        sessions,
            BigDecimal distanceMeters,
            BigDecimal tss
    ) {}
}
