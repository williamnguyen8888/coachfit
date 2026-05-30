-- Add garmin_workout_id to calendar_events so we can track workouts pushed to Garmin Connect.
-- Also add garmin_scheduled_id for the schedule entry (separate from the workout definition).

ALTER TABLE calendar_events
    ADD COLUMN garmin_workout_id    VARCHAR(64),
    ADD COLUMN garmin_scheduled_id  VARCHAR(64),
    ADD COLUMN garmin_synced_at     TIMESTAMPTZ;

COMMENT ON COLUMN calendar_events.garmin_workout_id   IS 'Garmin Training API workout definition ID (returned from POST /training-api/workout)';
COMMENT ON COLUMN calendar_events.garmin_scheduled_id IS 'Garmin Training API schedule ID (returned from POST /training-api/workout/{id}/schedule)';
COMMENT ON COLUMN calendar_events.garmin_synced_at    IS 'Timestamp of last successful sync to Garmin Training API';
