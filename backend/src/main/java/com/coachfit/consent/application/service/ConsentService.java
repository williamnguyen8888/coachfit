package com.coachfit.consent.application.service;

import com.coachfit.consent.application.port.in.ConsentUseCase;
import com.coachfit.consent.application.port.out.ConsentPersistencePort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link ConsentUseCase}.
 *
 * <p>Policy version is left as {@code null} for now — wire in a configuration
 * property (e.g. {@code app.privacy.policy-version}) when the privacy policy
 * versioning process is formalised in Phase 2.
 */
@Service
public class ConsentService implements ConsentUseCase {

    private final ConsentPersistencePort persistence;

    public ConsentService(ConsentPersistencePort persistence) {
        this.persistence = persistence;
    }

    @Override
    public void recordConsent(UUID userId, String type, boolean granted,
                              String ipAddress, String userAgent) {
        persistence.save(userId, type, granted, ipAddress, userAgent, null);
    }

    @Override
    public List<ConsentRecord> getConsentLog(UUID userId) {
        return persistence.findByUserId(userId);
    }
}
