package com.coachfit.athlete.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Core domain representation of an athlete's profile.
 *
 * <p>Maps to the {@code athlete_profiles} table (docs/04-db-schema.md §athlete_profiles).
 * All fields except {@code userId} are nullable — the profile row is created lazily
 * on first PUT /athlete.
 */
public record AthleteProfile(
        UUID        id,
        UUID        userId,
        LocalDate   dateOfBirth,
        String      gender,             // male | female | other
        BigDecimal  weightKg,
        BigDecimal  heightCm,
        List<String> sports,            // cycling | running | swimming
        String      experienceLevel,    // beginner | intermediate | advanced | expert
        String      primarySport,
        String      primaryHealthSource, // garmin | coros | polar
        Instant     createdAt,
        Instant     updatedAt
) {}
