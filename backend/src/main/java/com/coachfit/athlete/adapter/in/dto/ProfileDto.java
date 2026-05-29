package com.coachfit.athlete.adapter.in.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Nested profile sub-object inside {@link AthleteResponse}.
 *
 * <p>All fields nullable — new users may not have a profile row yet.
 */
public record ProfileDto(
        List<String> sports,
        String       primarySport,
        String       experienceLevel,
        BigDecimal   weightKg,
        BigDecimal   heightCm,
        String       gender,
        LocalDate    dateOfBirth,
        String       primaryHealthSource
) {}
