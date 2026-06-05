-- V036__create_audit_log.sql
-- Sensitive-change audit trail (docs/04-db-schema.md § Support Tables)

CREATE TABLE audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id),  -- actor
    action      VARCHAR(50) NOT NULL,                        -- zone_updated / tier_changed / permission_changed / coach_revoked / account_deleted
    entity_type VARCHAR(50),                                 -- user / subscription / coach_athletes / sport_zones
    entity_id   UUID,                                        -- nullable
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),                                 -- nullable
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_created ON audit_log (user_id, created_at DESC);
