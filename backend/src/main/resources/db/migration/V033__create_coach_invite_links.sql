-- V033__create_coach_invite_links.sql
-- Shareable invite link resources managed by coaches (docs/04-db-schema.md § Support Tables)

CREATE TABLE coach_invite_links (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_user_id  UUID        NOT NULL REFERENCES users(id),
    code           VARCHAR(50) UNIQUE NOT NULL,   -- random 12-char alphanumeric code
    is_reusable    BOOLEAN     NOT NULL DEFAULT false,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    max_uses       INTEGER,                        -- NULL = unlimited
    used_count     INTEGER     NOT NULL DEFAULT 0,
    expires_at     TIMESTAMPTZ,                    -- NULL = never expires
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach link management queries
CREATE INDEX idx_coach_invite_links_coach ON coach_invite_links (coach_user_id);
-- Public join endpoint: lookup by code
CREATE INDEX idx_coach_invite_links_code  ON coach_invite_links (code);
