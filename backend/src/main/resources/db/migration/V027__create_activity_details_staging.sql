-- Staging table for Garmin activity-details (streams) that arrive before
-- the parent activity summary due to race conditions.
--
-- Problem: Garmin can push /activity-details before /activities for the same summaryId.
-- The current code silently drops details if the parent activity is not found yet.
-- This table captures orphaned details and a scheduled reconciliation job retries them.
--
-- Retention: rows are deleted after successful reconciliation (moved to activity_streams).
-- Rows older than 7 days with no parent are moved to error state (parent never arrived).

CREATE TABLE activity_details_staging (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL,
    source        VARCHAR(20)  NOT NULL DEFAULT 'garmin',
    summary_id    VARCHAR(255) NOT NULL,       -- Garmin summaryId / Strava activity ID
    payload_json  TEXT         NOT NULL,       -- raw payload for reprocessing
    sync_log_id   UUID,                        -- original sync_log entry
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending / reconciled / error
    attempt_count INTEGER      NOT NULL DEFAULT 0,
    last_error    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reconciled_at TIMESTAMPTZ,

    CONSTRAINT fk_activity_details_staging_user
        FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_activity_details_staging_pending
    ON activity_details_staging (user_id, source, summary_id)
    WHERE status = 'pending';

CREATE INDEX idx_activity_details_staging_created
    ON activity_details_staging (created_at)
    WHERE status = 'pending';
