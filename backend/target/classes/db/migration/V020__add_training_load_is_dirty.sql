-- Add is_dirty flag to training_load for incremental recalculation.
-- See docs/06-sync-engine-spec.md §Daily Training Load Update:
-- "Mark dirty: UPDATE training_load SET is_dirty = true WHERE user_id = ? AND date >= {changed_date}"

ALTER TABLE training_load
    ADD COLUMN IF NOT EXISTS is_dirty BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_training_load_user_dirty
    ON training_load (user_id, is_dirty)
    WHERE is_dirty = true;
