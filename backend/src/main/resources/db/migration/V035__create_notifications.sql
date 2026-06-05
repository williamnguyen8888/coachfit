-- V035__create_notifications.sql
-- In-app notification feed for athletes and coaches (docs/04-db-schema.md § Support Tables)

CREATE TABLE notifications (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id),  -- recipient
    type       VARCHAR(50)  NOT NULL,                        -- coach_invite / workout_assigned / workout_completed / comment_added / alert_overtraining / alert_missed_workout
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    data       JSONB,                                        -- {activityId, athleteId, workoutId, ...}
    is_read    BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Unread count badge + notification list (docs/05-api-design.md § Coach — Notifications)
CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at DESC);
