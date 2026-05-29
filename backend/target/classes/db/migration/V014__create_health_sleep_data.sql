-- Health sleep data — provider-agnostic nightly sleep breakdown.
-- date = wakeup date (not sleep start date).
-- Multiple sources allowed per user per date.

CREATE TABLE health_sleep_data (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    date             DATE        NOT NULL,   -- date of wakeup
    source           VARCHAR(20) NOT NULL,   -- garmin / coros / polar / apple_health
    sleep_start      TIMESTAMPTZ,
    sleep_end        TIMESTAMPTZ,
    duration_seconds INTEGER,                -- total sleep time
    deep_seconds     INTEGER,
    light_seconds    INTEGER,
    rem_seconds      INTEGER,
    awake_seconds    INTEGER,
    sleep_score      INTEGER,                -- 0-100, provider-supplied
    avg_respiration  DECIMAL(4,1),           -- nullable
    avg_spo2         DECIMAL(4,1),           -- nullable
    avg_hrv          DECIMAL(6,2),           -- rMSSD nightly average, nullable
    hrv_status       VARCHAR(20),            -- balanced / low / unbalanced
    extra            JSONB        NOT NULL DEFAULT '{}',
    raw_payload      JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_health_sleep_data_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_health_sleep_data_user_source_date
        UNIQUE (user_id, source, date)
);

CREATE INDEX idx_health_sleep_data_user_date
    ON health_sleep_data (user_id, date DESC);
