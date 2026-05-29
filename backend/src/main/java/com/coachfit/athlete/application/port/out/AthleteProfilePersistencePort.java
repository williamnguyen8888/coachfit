package com.coachfit.athlete.application.port.out;

import com.coachfit.athlete.domain.model.AthleteProfile;

import java.util.Optional;
import java.util.UUID;

/**
 * Output port: {@code athlete_profiles} persistence operations.
 */
public interface AthleteProfilePersistencePort {

    Optional<AthleteProfile> findByUserId(UUID userId);

    /** Upserts on {@code (user_id)} unique constraint. */
    AthleteProfile upsert(AthleteProfile profile);
}
