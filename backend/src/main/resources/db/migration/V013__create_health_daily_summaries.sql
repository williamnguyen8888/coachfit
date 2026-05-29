-- Health daily summaries — provider-agnostic daily health metrics.
-- Multiple sources allowed per user per date (UNIQUE on user_id + source + date).
-- extra: provider-specific data that doesn't fit the common columns.
-- raw_payload: full raw provider payload for debug/reprocessing.

CREATE TABLE health_daily_summaries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    date                DATE        NOT NULL,
    source              VARCHAR(20) NOT NULL,   -- garmin / coros / polar / wahoo / apple_health / manual
    steps               INTEGER,
    distance_meters     DECIMAL(10,2),
    calories_total      INTEGER,
    calories_active     INTEGER,
    active_minutes      INTEGER,
    intensity_minutes   INTEGER,                -- nullable, Garmin-specific
    floors_climbed      INTEGER,
    resting_hr          INTEGER,
    avg_hr              INTEGER,
    max_hr              INTEGER,
    avg_stress          INTEGER,                -- 0-100
    max_stress          INTEGER,
    body_battery_high   INTEGER,                -- 0-100, Garmin/COROS
    body_battery_low    INTEGER,
    avg_spo2            DECIMAL(4,1),           -- %
    avg_respiration     DECIMAL(4,1),           -- breaths/min
    vo2max              DECIMAL(4,1),           -- ml/kg/min
    extra               JSONB        NOT NULL DEFAULT '{}',
    raw_payload         JSONB,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_health_daily_summaries_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_health_daily_summaries_user_source_date
        UNIQUE (user_id, source, date)
);

CREATE INDEX idx_health_daily_summaries_user_date
    ON health_daily_summaries (user_id, date DESC);
