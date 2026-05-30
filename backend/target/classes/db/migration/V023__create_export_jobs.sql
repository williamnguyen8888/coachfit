-- Async data export jobs — GDPR Right to Access (Art. 15) and Right to Portability (Art. 20).
-- docs/11-privacy-compliance.md §3.1, §3.4
CREATE TABLE export_jobs (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING | PROCESSING | DONE | FAILED
    file_url    VARCHAR(1024),                             -- pre-signed MinIO URL when DONE
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ                                -- 7-day TTL per docs
);

CREATE INDEX idx_export_jobs_user ON export_jobs(user_id);
