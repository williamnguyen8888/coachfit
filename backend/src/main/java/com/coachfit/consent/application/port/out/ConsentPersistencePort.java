package com.coachfit.consent.application.port.out;

import com.coachfit.consent.application.port.in.ConsentUseCase.ConsentRecord;

import java.util.List;
import java.util.UUID;

/**
 * Output port: consent persistence operations.
 */
public interface ConsentPersistencePort {

    void save(UUID userId, String type, boolean granted,
              String ipAddress, String userAgent, String version);

    /** Returns consent records for a user, ordered by granted_at DESC. */
    List<ConsentRecord> findByUserId(UUID userId);
}
