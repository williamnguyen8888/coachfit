-- V030__add_activity_extended_fields.sql
-- Add extended metrics fields to activities and activity_laps tables.
-- Covers: elevation descent, max speed, altitude range, temperature,
-- Garmin Training Effect, running dynamics, cycling technique, swimming metrics.

-- ─── activities ────────────────────────────────────────────────────────────────

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS total_descent_meters          NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS max_speed                     NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS avg_temperature               SMALLINT,
    ADD COLUMN IF NOT EXISTS min_altitude                  NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS max_altitude                  NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS aerobic_training_effect       NUMERIC(3,1),
    ADD COLUMN IF NOT EXISTS anaerobic_training_effect     NUMERIC(3,1),
    ADD COLUMN IF NOT EXISTS avg_vertical_oscillation      NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS avg_ground_contact_time       NUMERIC(7,1),
    ADD COLUMN IF NOT EXISTS avg_step_length               NUMERIC(7,1),
    ADD COLUMN IF NOT EXISTS avg_vertical_ratio            NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS left_right_balance            NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS avg_left_pedal_smoothness     NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS avg_left_torque_effectiveness NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS pool_length                   NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS swim_stroke                   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS avg_swolf                     NUMERIC(5,1);

-- ─── activity_laps ─────────────────────────────────────────────────────────────

ALTER TABLE activity_laps
    ADD COLUMN IF NOT EXISTS normalized_power    INTEGER,
    ADD COLUMN IF NOT EXISTS max_speed           NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS elevation_descent   NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS lap_trigger         VARCHAR(20);
