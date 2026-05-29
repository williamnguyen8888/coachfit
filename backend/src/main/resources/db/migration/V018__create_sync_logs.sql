-- Sync logs — audit trail for every provider webhook/push event.
-- activity_id FK is nullable (populated after successful processing).

CREATE TABLE sync_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    provider      VARCHAR(20) NOT NULL,
    event_type    VARCHAR(50),
    -- activity_created / activity_updated / activity_deleted /
    -- file_upload / health_daily_push / health_sleep_push /
    -- health_body_push / health_hrv_push / provider_deregistration
    status        VARCHAR(20),
    -- pending / processing / success / failed / skipped
    source_id     VARCHAR(255),           -- provider's own ID for this event
    activity_id   UUID,                   -- nullable, set after processing
    error_message TEXT,
    payload       JSONB,                  -- raw webhook payload
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_sync_logs_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_sync_logs_activity_id
        FOREIGN KEY (activity_id) REFERENCES activities (id)
);

CREATE INDEX idx_sync_logs_user_created_at
    ON sync_logs (user_id, created_at DESC);
