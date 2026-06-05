-- V031: Analytics module — supporting index for power curve queries.
--
-- No new tables are needed; the analytics module queries existing tables:
--   - training_load     (PMC chart)
--   - activities        (power curve + zone distribution)
--   - activity_streams  (power curve + zone distribution)
--   - sport_zones       (zone boundaries)
--
-- This migration adds a partial index on activity_streams to accelerate
-- the power-curve lateral unnest for activities that have power data.
-- The existing index on (user_id, sport, date) in activities already covers
-- the date-range filter; this covers the join to streams efficiently.

-- Partial index: only activities with a non-null power stream are indexed.
-- Dramatically reduces the scan for power curve queries which only look at
-- activities with power data.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_power_not_null
    ON activity_streams (activity_id)
    WHERE power IS NOT NULL;

-- Supporting index for zone-distribution queries: speeds up the
-- LATERAL unnest of heart_rate arrays for activities in a date range.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_hr_not_null
    ON activity_streams (activity_id)
    WHERE heart_rate IS NOT NULL;
