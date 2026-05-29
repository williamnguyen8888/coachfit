package com.coachfit.athlete.application.port.in;

import com.coachfit.athlete.domain.model.AthleteProfile;
import com.coachfit.athlete.domain.model.UserSummary;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Use case: update the current athlete's profile.
 *
 * <p>Docs: {@code PUT /api/v1/athlete} — tier: free.
 * All profile fields are optional; only non-null values in the command are applied.
 */
public interface UpdateAthleteProfileUseCase {

    Result update(UpdateCommand command);

    record Result(UserSummary user, AthleteProfile profile) {}

    /**
     * All fields are nullable — only provided fields are updated.
     *
     * <p>{@code fullName} and {@code settings} update the {@code users} table;
     * all other fields update {@code athlete_profiles}.
     */
    record UpdateCommand(
            UUID userId,

            // users table fields
            String fullName,
            String settings,  // raw JSON string e.g. {"locale":"vi","units":"metric"}

            // athlete_profiles fields
            List<String> sports,
            String       primarySport,
            String       experienceLevel,

            @DecimalMin("0.1") @DecimalMax("500")
            BigDecimal   weightKg,

            @DecimalMin("1") @DecimalMax("300")
            BigDecimal   heightCm,

            String       gender,
            LocalDate    dateOfBirth,
            String       primaryHealthSource
    ) {}
}
