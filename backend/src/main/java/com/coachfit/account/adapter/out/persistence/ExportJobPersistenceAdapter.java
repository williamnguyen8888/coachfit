package com.coachfit.account.adapter.out.persistence;

import com.coachfit.account.application.port.out.ExportJobPersistencePort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
class ExportJobPersistenceAdapter implements ExportJobPersistencePort {

    private final ExportJobJpaRepository repo;

    ExportJobPersistenceAdapter(ExportJobJpaRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public UUID createJob(UUID userId) {
        return repo.save(new ExportJobEntity(userId)).id;
    }

    @Override
    public Optional<ExportJobRow> findLatestForUser(UUID userId) {
        return repo.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(e -> new ExportJobRow(e.id, e.userId, e.status,
                        e.fileUrl, e.createdAt, e.expiresAt));
    }

    @Override
    @Transactional
    public void updateJob(UUID jobId, String status, String fileUrl, Instant expiresAt) {
        repo.findById(jobId).ifPresent(e -> {
            e.status    = status;
            e.fileUrl   = fileUrl;
            e.expiresAt = expiresAt;
            repo.save(e);
        });
    }
}
