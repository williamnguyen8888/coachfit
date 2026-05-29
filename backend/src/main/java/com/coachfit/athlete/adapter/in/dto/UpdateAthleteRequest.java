package com.coachfit.athlete.adapter.in.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Request body for {@code PUT /athlete}.
 *
 * <p>All fields are optional — only non-null values are applied (merge-patch semantics).
 */
public record UpdateAthleteRequest(
        String fullName,

        // Raw JSON object is accepted as a Map / Object from the client.
        // Validated in the service as an opaque settings blob.
        Object settings,

        List<String> sports,

        String primarySport,

        String experienceLevel,

        @DecimalMin(value = "0.1", message = "Weight must be > 0")
        @DecimalMax(value = "500",  message = "Weight must be ≤ 500 kg")
        BigDecimal weightKg,

        @DecimalMin(value = "1",   message = "Height must be > 0")
        @DecimalMax(value = "300", message = "Height must be ≤ 300 cm")
        BigDecimal heightCm,

        String gender,

        LocalDate dateOfBirth,

        String primaryHealthSource
) {}
