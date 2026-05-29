-- Activities — primary workout/training records.
-- Source-level dedup via UNIQUE(user_id, source, source_id).
-- gear_id FK added after gear table; defined as DEFERRABLE so circular deps are avoidable.

CREATE TABLE activities (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL,
    source                  VARCHAR(20) NOT NULL,
    source_id               VARCHAR(255),
    sport                   VARCHAR(50) NOT NULL,
    sub_sport               VARCHAR(50),
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    started_at              TIMESTAMPTZ NOT NULL,
    duration_seconds        INTEGER     NOT NULL,
    moving_time_seconds     INTEGER,
    distance_meters         DECIMAL(12,2),
    elevation_gain_meters   DECIMAL(8,2),
    calories                INTEGER,
    avg_heart_rate          INTEGER,
    max_heart_rate          INTEGER,
    avg_power               INTEGER,
    max_power               INTEGER,
    normalized_power        INTEGER,
    intensity_factor        DECIMAL(4,3),
    tss                     DECIMAL(8,2),
    avg_cadence             INTEGER,
    avg_pace                DECIMAL(8,2),
    avg_speed               DECIMAL(8,2),
    start_lat               DECIMAL(10,7),
    start_lng               DECIMAL(10,7),
    gear_id                 UUID,                   -- FK → gear added post-gear migration
    weather                 JSONB,
    raw_file_path           VARCHAR(512),
    raw_file_format         VARCHAR(10),
    extra                   JSONB        NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT fk_activities_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_activities_user_source_source_id
        UNIQUE NULLS NOT DISTINCT (user_id, source, source_id)
);

-- Activity list query (most common read path)
CREATE INDEX idx_activities_user_started_at
    ON activities (user_id, started_at DESC);

-- Filter by sport
CREATE INDEX idx_activities_user_sport
    ON activities (user_id, sport);
