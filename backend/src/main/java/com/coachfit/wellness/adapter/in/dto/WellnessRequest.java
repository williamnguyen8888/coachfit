package com.coachfit.wellness.adapter.in.dto;

import com.coachfit.wellness.application.port.in.WellnessUseCase.WellnessInput;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

/**
 * Request DTO for POST /api/v1/wellness and PUT /api/v1/wellness/{date}.
 * All fields are optional — only non-null values are merged into the log.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WellnessRequest(
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
        String     notes
) {
    public WellnessInput toInput() {
        return new WellnessInput(mood, rpe, sleepQuality, sleepHours,
                fatigue, soreness, stressLevel, restingHr, hrv, weightKg, notes);
    }
}
