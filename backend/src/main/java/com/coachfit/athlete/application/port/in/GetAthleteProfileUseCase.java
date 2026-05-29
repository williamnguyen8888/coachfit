package com.coachfit.athlete.application.port.in;

import com.coachfit.athlete.domain.model.AthleteProfile;
import com.coachfit.athlete.domain.model.UserSummary;

import java.util.UUID;

/**
 * Use case: retrieve the current athlete's profile.
 *
 * <p>Docs: {@code GET /api/v1/athlete} — tier: free.
 * Profile row may not yet exist (new user) — callers must handle {@code null} profile.
 */
public interface GetAthleteProfileUseCase {

    /**
     * @param userId authenticated user ID from JWT
     * @return user + profile (profile may be null for new users)
     */
    Result getProfile(UUID userId);

    record Result(UserSummary user, AthleteProfile profile) {}
}
