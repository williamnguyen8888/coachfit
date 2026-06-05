-- V034__create_activity_comments.sql
-- Threaded comments on activities (athlete self + coach) (docs/04-db-schema.md § Support Tables)

CREATE TABLE activity_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID        NOT NULL REFERENCES activities(id),
    user_id     UUID        NOT NULL REFERENCES users(id),  -- comment author (athlete or coach)
    parent_id   UUID        REFERENCES activity_comments(id), -- NULL = top-level, non-NULL = reply
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ                                  -- soft delete
);

-- Primary read access pattern: list comments for an activity ordered by time
CREATE INDEX idx_activity_comments_activity ON activity_comments (activity_id, created_at);
-- Reply thread lookup
CREATE INDEX idx_activity_comments_parent   ON activity_comments (parent_id) WHERE parent_id IS NOT NULL;
