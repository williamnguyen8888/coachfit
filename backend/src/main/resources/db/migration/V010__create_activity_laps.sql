-- Activity laps — per-lap breakdown of an activity.

CREATE TABLE activity_laps (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id      UUID        NOT NULL,
    lap_index        SMALLINT    NOT NULL,  -- 0-based
    start_time       TIMESTAMPTZ,
    duration_seconds INTEGER,
    distance_meters  DECIMAL(10,2),
    avg_heart_rate   INTEGER,
    max_heart_rate   INTEGER,
    avg_power        INTEGER,
    max_power        INTEGER,
    avg_cadence      INTEGER,
    avg_pace         DECIMAL(8,2),
    elevation_gain   DECIMAL(8,2),

    CONSTRAINT fk_activity_laps_activity_id
        FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_laps_activity_id
    ON activity_laps (activity_id);
