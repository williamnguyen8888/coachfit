-- Activity streams — time-series data stored as arrays for I/O efficiency.
-- One row per activity (UNIQUE on activity_id).

CREATE TABLE activity_streams (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID    NOT NULL,

    -- All arrays share the same index position.
    timestamps  INTEGER[],          -- seconds from activity start
    heart_rate  SMALLINT[],         -- bpm
    power       SMALLINT[],         -- watts
    cadence     SMALLINT[],         -- rpm
    speed       REAL[],             -- m/s
    altitude    REAL[],             -- meters
    latitude    DOUBLE PRECISION[], -- decimal degrees
    longitude   DOUBLE PRECISION[], -- decimal degrees
    distance    REAL[],             -- cumulative meters
    temperature SMALLINT[],         -- celsius
    grade       REAL[],             -- percent

    CONSTRAINT fk_activity_streams_activity_id
        FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE,
    CONSTRAINT uq_activity_streams_activity_id
        UNIQUE (activity_id)
);
