-- Add dedicated body composition columns to health_daily_summaries.
-- Previously stored only in extra JSONB — now promoted to first-class columns
-- for efficient time-series queries (weight trends, body composition analytics).
--
-- Existing rows that stored body composition in extra.weight_kg etc. are NOT
-- backfilled here — they will be refreshed on next Garmin push or manual sync.

ALTER TABLE health_daily_summaries
    ADD COLUMN weight_kg      DECIMAL(5,2),   -- body weight in kg (precision: 0.01 kg)
    ADD COLUMN body_fat_pct   DECIMAL(4,1),   -- body fat percentage (0–100)
    ADD COLUMN muscle_mass_kg DECIMAL(5,2),   -- lean muscle mass in kg (if available)
    ADD COLUMN bone_mass_kg   DECIMAL(4,2),   -- bone mass in kg (if available)
    ADD COLUMN bmi            DECIMAL(4,1);   -- body mass index

COMMENT ON COLUMN health_daily_summaries.weight_kg      IS 'Body weight in kg (Garmin body composition push)';
COMMENT ON COLUMN health_daily_summaries.body_fat_pct   IS 'Body fat percentage (Garmin body composition push)';
COMMENT ON COLUMN health_daily_summaries.muscle_mass_kg IS 'Lean muscle mass in kg (if available from scale)';
COMMENT ON COLUMN health_daily_summaries.bone_mass_kg   IS 'Bone mass in kg (if available from scale)';
COMMENT ON COLUMN health_daily_summaries.bmi            IS 'Body mass index (computed by Garmin or derived)';

-- Index for weight trend queries (most common analytics query)
CREATE INDEX idx_health_daily_summaries_weight
    ON health_daily_summaries (user_id, date DESC)
    WHERE weight_kg IS NOT NULL;
