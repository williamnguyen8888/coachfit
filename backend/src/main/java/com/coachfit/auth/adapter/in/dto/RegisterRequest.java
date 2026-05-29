package com.coachfit.auth.adapter.in.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for {@code POST /api/v1/auth/register}. */
public record RegisterRequest(
        @NotBlank @Email                          String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank(message = "Full name is required") String fullName
) {}
