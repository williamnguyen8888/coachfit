-- Wellness logs — one entry per user per date.
-- Combines manual subjective entries and auto data from wearables.
-- field_sources JSONB tracks which provider supplied each field.

CREATE TABLE wellness_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    date          DATE        NOT NULL,
    source        VARCHAR(20) NOT NULL DEFAULT 'manual',   -- manual / garmin / coros / polar
    mood          SMALLINT,           -- 1-5 (manual)
    rpe           SMALLINT,           -- 1-10 Rate of Perceived Exertion (manual)
    sleep_quality SMALLINT,           -- 1-5
    sleep_hours   DECIMAL(3,1),
    fatigue       SMALLINT,           -- 1-5
    soreness      SMALLINT,           -- 1-5
    stress_level  SMALLINT,           -- 1-5
    resting_hr    INTEGER,            -- bpm
    hrv           DECIMAL(6,2),       -- rMSSD ms
    weight_kg     DECIMAL(5,2),
    notes         TEXT,
    field_sources JSONB        NOT NULL DEFAULT '{}',

    CONSTRAINT fk_wellness_logs_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_wellness_logs_user_date
        UNIQUE (user_id, date)
);
