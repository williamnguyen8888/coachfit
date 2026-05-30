-- Consent logging — GDPR §5 (docs/11-privacy-compliance.md §5. Quản lý đồng ý)
-- Records every explicit user consent / withdrawal event.
-- type is a free-form string (not a DB enum) so new consent types need no migration.
CREATE TABLE consents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(80) NOT NULL,    -- e.g. health_data_processing | strava_sync | garmin_sync
    granted     BOOLEAN     NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address  VARCHAR(45),            -- IPv4 or IPv6
    user_agent  VARCHAR(512),
    version     VARCHAR(20)             -- policy / consent form version at time of event
);

CREATE INDEX idx_consents_user ON consents(user_id);
