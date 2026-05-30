package com.coachfit.dashboard.adapter.in.dto;

import com.coachfit.dashboard.application.port.in.GetFitnessTrendUseCase.FitnessTrend;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for GET /api/v1/dashboard/fitness-trend.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FitnessTrendResponse(
        String              sport,
        List<TrendPointDto> points
) {
    public static FitnessTrendResponse from(FitnessTrend trend) {
        return new FitnessTrendResponse(
                trend.sport(),
                trend.points().stream()
                        .map(p -> new TrendPointDto(p.date(), p.ctl(), p.atl(), p.tsb(), p.dailyTss()))
                        .toList());
    }

    public record TrendPointDto(
            LocalDate  date,
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb,
            BigDecimal dailyTss
    ) {}
}
