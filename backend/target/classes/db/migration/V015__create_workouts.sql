-- Workouts — structured workout definitions (system templates + user-created).
-- user_id nullable: null = system template.
-- steps JSONB holds the full workout structure (see docs/07-workout-data-model.md).

CREATE TABLE workouts (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID,                   -- null = system template
    name                        VARCHAR(255) NOT NULL,
    sport                       VARCHAR(50)  NOT NULL,
    description                 TEXT,
    estimated_duration_seconds  INTEGER,
    estimated_tss               DECIMAL(6,2),
    steps                       JSONB        NOT NULL,  -- workout structure
    tags                        TEXT[],
    is_template                 BOOLEAN      NOT NULL DEFAULT false,
    is_public                   BOOLEAN      NOT NULL DEFAULT false,
    source                      VARCHAR(20)  NOT NULL DEFAULT 'user',  -- user / system / coach / import
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at                  TIMESTAMPTZ,

    CONSTRAINT fk_workouts_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_workouts_user_id
    ON workouts (user_id);
