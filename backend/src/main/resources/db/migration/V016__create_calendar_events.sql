-- Calendar events — planned/completed training on the athlete calendar.
-- Links a planned workout to an actual activity when completed.
-- compliance_score auto-calculated when activity linked.

CREATE TABLE calendar_events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    date             DATE        NOT NULL,
    event_type       VARCHAR(20) NOT NULL,              -- workout / note / race / rest
    workout_id       UUID,                              -- nullable FK → workouts
    activity_id      UUID,                              -- nullable FK → activities (linked when done)
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'planned',  -- planned / completed / skipped / partial
    order_index      SMALLINT     NOT NULL DEFAULT 0,   -- ordering when multiple events same day
    compliance_score DECIMAL(5,2),                      -- 0-100%, set when activity linked
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,

    CONSTRAINT fk_calendar_events_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_calendar_events_workout_id
        FOREIGN KEY (workout_id) REFERENCES workouts (id),
    CONSTRAINT fk_calendar_events_activity_id
        FOREIGN KEY (activity_id) REFERENCES activities (id)
);

CREATE INDEX idx_calendar_events_user_date
    ON calendar_events (user_id, date);
