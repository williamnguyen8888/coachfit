-- V039: Add threshold_pace and css to sport_zones; add VI/EF to activities.
--
-- threshold_pace: seconds per km (running) or seconds per 100m (swimming)
--   Used for rTSS and sTSS calculations instead of abusing the ftp column.
--
-- css: Critical Swim Speed in seconds per 100m
--   Used for swimming sTSS calculation.
--
-- activities.variability_index: NP / AvgPower (stored as DECIMAL(4,3))
-- activities.efficiency_factor: NP / AvgHR or Pace / AvgHR (stored as DECIMAL(6,3))

-- ── sport_zones additions ─────────────────────────────────────────────────────

ALTER TABLE sport_zones
    ADD COLUMN IF NOT EXISTS threshold_pace INTEGER,   -- sec/km (running) | sec/100m (swimming)
    ADD COLUMN IF NOT EXISTS css            INTEGER;   -- Critical Swim Speed (sec/100m)

-- ── activities additions ──────────────────────────────────────────────────────

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS variability_index DECIMAL(4,3),  -- NP / AvgPower
    ADD COLUMN IF NOT EXISTS efficiency_factor DECIMAL(6,3);  -- NP / AvgHR
