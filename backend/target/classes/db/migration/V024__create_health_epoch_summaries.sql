-- Health epoch summaries — Garmin intraday data (15-minute blocks).
-- Each epoch represents a 15-minute summary of activity metrics within a day.
-- Used for intraday timeline visualization and activity pattern analysis.

CREATE TABLE health_epoch_summaries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    date                DATE        NOT NULL,
    epoch_start         TIMESTAMPTZ NOT NULL,          -- absolute start of this 15-min block
    duration_seconds    INTEGER     NOT NULL,          -- typically 900 (15 min)
    source              VARCHAR(20) NOT NULL,          -- garmin / coros / polar
    steps               INTEGER,
    active_calories     INTEGER,                       -- kcal burned in this epoch
    met                 DECIMAL(4,2),                  -- metabolic equivalent 1.0–20.0
    intensity           VARCHAR(20),                   -- SEDENTARY / ACTIVE / HIGHLY_ACTIVE / etc.
    moving_duration_sec INTEGER,                       -- seconds actually moving within epoch
    distance_meters     DECIMAL(8,2),
    extra               JSONB        NOT NULL DEFAULT '{}',
    raw_payload         JSONB,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_health_epoch_summaries_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_health_epoch_summaries_user_source_start
        UNIQUE (user_id, source, epoch_start)
);

CREATE INDEX idx_health_epoch_summaries_user_date
    ON health_epoch_summaries (user_id, date DESC);

CREATE INDEX idx_health_epoch_summaries_user_start
    ON health_epoch_summaries (user_id, epoch_start DESC);
