package com.coachfit.consent.adapter.out.persistence;

import com.coachfit.consent.application.port.in.ConsentUseCase.ConsentRecord;
import com.coachfit.consent.application.port.out.ConsentPersistencePort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
class ConsentPersistenceAdapter implements ConsentPersistencePort {

    private final ConsentJpaRepository repo;

    ConsentPersistenceAdapter(ConsentJpaRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public void save(UUID userId, String type, boolean granted,
                     String ipAddress, String userAgent, String version) {
        repo.save(new ConsentEntity(userId, type, granted, ipAddress, userAgent, version));
    }

    @Override
    public List<ConsentRecord> findByUserId(UUID userId) {
        return repo.findByUserIdOrderByGrantedAtDesc(userId)
                .stream()
                .map(e -> new ConsentRecord(e.id, e.type, e.granted,
                        e.grantedAt, e.ipAddress, e.version))
                .toList();
    }
}
