package com.coachfit.wellness.adapter.in.dto;

import com.coachfit.wellness.application.port.in.WellnessUseCase.WellnessEntry;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for wellness read and write endpoints.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WellnessResponse(
        LocalDate  date,
        String     source,
        Short      mood,
        Short      rpe,
        Short      sleepQuality,
        BigDecimal sleepHours,
        Short      fatigue,
        Short      soreness,
        Short      stressLevel,
        Integer    restingHr,
        BigDecimal hrv,
        BigDecimal weightKg,
        String     notes,
        Object     fieldSources   // passthrough JSON string / object
) {
    public static WellnessResponse from(WellnessEntry e) {
        return new WellnessResponse(
                e.date(), e.source(), e.mood(), e.rpe(), e.sleepQuality(),
                e.sleepHours(), e.fatigue(), e.soreness(), e.stressLevel(),
                e.restingHr(), e.hrv(), e.weightKg(), e.notes(), e.fieldSources());
    }

    public static List<WellnessResponse> fromList(List<WellnessEntry> entries) {
        return entries.stream().map(WellnessResponse::from).toList();
    }
}
