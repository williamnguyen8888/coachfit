-- External calendar event metadata for third-party workout imports.
-- external_id lets clients safely retry/upsert without creating duplicates.

ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS external_id      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS external_source  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS external_uid     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS external_category VARCHAR(30),
    ADD COLUMN IF NOT EXISTS external_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_external_active
    ON calendar_events (user_id, external_source, external_id)
    WHERE external_id IS NOT NULL
      AND external_source IS NOT NULL
      AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_external_source_date
    ON calendar_events (user_id, external_source, date)
    WHERE external_source IS NOT NULL
      AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_external_uid_active
    ON calendar_events (user_id, external_uid)
    WHERE external_uid IS NOT NULL
      AND deleted_at IS NULL;
