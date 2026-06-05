-- V032__create_coach_athletes.sql
-- Coach-athlete relationship table (docs/04-db-schema.md § Support Tables)

CREATE TABLE coach_athletes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_user_id    UUID        NOT NULL REFERENCES users(id),
    athlete_user_id  UUID        NOT NULL REFERENCES users(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / active / revoked / expired
    invite_type      VARCHAR(20),                              -- email / link / manual
    invite_token     VARCHAR(255),                             -- encrypted JWT token (email invite), nullable
    invite_code      VARCHAR(50),                              -- for shareable link invites, nullable
    permissions      JSONB       NOT NULL DEFAULT '{
        "readActivities":true,
        "readActivityStreams":true,
        "readWellness":true,
        "readHealthData":true,
        "readTrainingLoad":true,
        "writeCalendar":true,
        "writeWorkouts":true,
        "writeComments":true,
        "viewProfile":true,
        "viewZones":true
    }',
    nickname         VARCHAR(100),                             -- coach's custom label for athlete
    notes            TEXT,                                     -- coach's private notes
    tags             TEXT[]      DEFAULT '{}',                 -- coach tags: {'beginner','ironman'}
    invited_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at      TIMESTAMPTZ,                              -- set when status → active
    revoked_at       TIMESTAMPTZ,                              -- set when status → revoked
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT coach_athletes_unique UNIQUE (coach_user_id, athlete_user_id),
    CONSTRAINT coach_athletes_status_check CHECK (status IN ('pending','active','revoked','expired'))
);

-- Coach roster queries: list athletes for a given coach filtered by status
CREATE INDEX idx_coach_athletes_coach_status   ON coach_athletes (coach_user_id, status);
-- Athlete-side queries: who is coaching me
CREATE INDEX idx_coach_athletes_athlete        ON coach_athletes (athlete_user_id);
-- Token-based invite lookup
CREATE INDEX idx_coach_athletes_invite_token   ON coach_athletes (invite_token) WHERE invite_token IS NOT NULL;
-- Link-based invite lookup
CREATE INDEX idx_coach_athletes_invite_code    ON coach_athletes (invite_code)  WHERE invite_code  IS NOT NULL;
