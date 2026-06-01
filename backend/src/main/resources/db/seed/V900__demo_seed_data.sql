-- =============================================================================
-- CoachFit Demo Seed Data
-- =============================================================================
-- Purpose:
--   A deterministic, logically consistent demo dataset for calendar, workouts,
--   activities, health, wellness, sync, and timezone-sensitive flows.
--
-- Timezone contract:
--   - Demo athlete timezone is Asia/Ho_Chi_Minh.
--   - The seed transaction sets current_date to Asia/Ho_Chi_Minh.
--   - Calendar DATE values represent the athlete local day.
--   - Activity TIMESTAMPTZ values are built from athlete local timestamps using
--     AT TIME ZONE 'Asia/Ho_Chi_Minh'.
--   - Linked activity local date must equal the linked calendar event date.
--
-- Login:
--   athlete: minh@demo.coachfit.app / Demo@1234
--   coach:   coach@demo.coachfit.app / Demo@1234
-- =============================================================================

BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

-- -----------------------------------------------------------------------------
-- Cleanup old demo data first. This keeps the seed idempotent and removes rows
-- from the previous demo seed that could violate the one-active-activity-link rule.
-- -----------------------------------------------------------------------------

DELETE FROM activity_laps
 WHERE activity_id IN (
       SELECT id FROM activities
        WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                          'a0000002-0000-0000-0000-000000000002')
 );

DELETE FROM activity_streams
 WHERE activity_id IN (
       SELECT id FROM activities
        WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                          'a0000002-0000-0000-0000-000000000002')
 );

DELETE FROM sync_logs
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM activity_details_staging
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM calendar_events
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM health_epoch_summaries
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM health_sleep_data
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM health_daily_summaries
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM wellness_logs
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM training_load
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM consents
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM export_jobs
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM api_keys
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM refresh_tokens
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM oauth_connections
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM subscriptions
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM athlete_profiles
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM sport_zones
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM activities
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM gear
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM workouts
 WHERE user_id IN ('a0000001-0000-0000-0000-000000000001',
                   'a0000002-0000-0000-0000-000000000002');

DELETE FROM users
 WHERE id IN ('a0000001-0000-0000-0000-000000000001',
              'a0000002-0000-0000-0000-000000000002')
    OR email IN ('minh@demo.coachfit.app', 'coach@demo.coachfit.app');

-- -----------------------------------------------------------------------------
-- Users, auth, profile, settings
-- -----------------------------------------------------------------------------

INSERT INTO users (
    id, email, password_hash, full_name, avatar_url, role,
    onboarding_completed, settings, created_at
) VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'minh@demo.coachfit.app',
    '$2b$12$2qYL9m5LWjkwP5U1zmQKlukBtado7LIWNI4Y0FJhc2PmFt2v/RL5C',
    'Nguyen Van Minh',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=minh',
    'athlete',
    true,
    jsonb_build_object(
      'locale', 'vi',
      'units', 'metric',
      'timezone', 'Asia/Ho_Chi_Minh',
      'theme', 'dark',
      'calendarWeekStartsOn', 'monday'
    ),
    now() - interval '180 days'
  ),
  (
    'a0000002-0000-0000-0000-000000000002',
    'coach@demo.coachfit.app',
    '$2b$12$2qYL9m5LWjkwP5U1zmQKlukBtado7LIWNI4Y0FJhc2PmFt2v/RL5C',
    'Sarah Thompson',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    'coach',
    true,
    jsonb_build_object(
      'locale', 'en',
      'units', 'metric',
      'timezone', 'America/New_York',
      'theme', 'dark',
      'calendarWeekStartsOn', 'monday'
    ),
    now() - interval '365 days'
  );

INSERT INTO subscriptions (
    id, user_id, tier, status, stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end
) VALUES
  ('b0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'pro', 'active', 'cus_demo_minh', 'sub_demo_minh',
   now() - interval '15 days', now() + interval '15 days'),
  ('b0000002-0000-0000-0000-000000000002',
   'a0000002-0000-0000-0000-000000000002',
   'elite', 'active', 'cus_demo_sarah', 'sub_demo_sarah',
   now() - interval '1 day', now() + interval '29 days');

INSERT INTO feature_flags (id, name, description, enabled_tiers, enabled_globally)
VALUES
  ('fb000001-0000-0000-0000-000000000001',
   'calendar_drag_drop',
   'Enable drag and drop calendar rescheduling',
   ARRAY['pro','elite'],
   true),
  ('fb000002-0000-0000-0000-000000000002',
   'garmin_training_push',
   'Enable pushing planned workouts to Garmin calendar',
   ARRAY['pro','elite'],
   true)
ON CONFLICT (name) DO UPDATE
   SET description = EXCLUDED.description,
       enabled_tiers = EXCLUDED.enabled_tiers,
       enabled_globally = EXCLUDED.enabled_globally;

INSERT INTO athlete_profiles (
    id, user_id, date_of_birth, gender, weight_kg, height_cm,
    sports, experience_level, primary_sport, primary_health_source
) VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   '1994-03-15',
   'male',
   68.20,
   175.0,
   ARRAY['swimming','cycling','running','strength'],
   'advanced',
   'triathlon',
   'garmin');

INSERT INTO consents (id, user_id, type, granted, granted_at, ip_address, user_agent, version)
VALUES
  ('cc000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'health_data_processing',
   true,
   now() - interval '120 days',
   '127.0.0.1',
   'CoachFit Demo Seed',
   '2026.06'),
  ('cc000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'garmin_sync',
   true,
   now() - interval '120 days',
   '127.0.0.1',
   'CoachFit Demo Seed',
   '2026.06');

INSERT INTO oauth_connections (
    id, user_id, provider, provider_user_id, access_token, refresh_token,
    token_expires_at, scopes, last_sync_at, sync_status, push_enabled
) VALUES
  ('0c000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'garmin',
   'garmin-demo-minh',
   'demo-access-token',
   'demo-refresh-token',
   now() + interval '20 days',
   ARRAY['activities','health','training'],
   now() - interval '2 hours',
   'active',
   true);

-- -----------------------------------------------------------------------------
-- Zones and gear
-- -----------------------------------------------------------------------------

INSERT INTO sport_zones (id, user_id, sport, zone_type, ftp, lthr, max_hr, zones, effective_date)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'cycling', 'power', 285, NULL, NULL,
   '[{"zone":1,"name":"Active Recovery","min":null,"max":152},{"zone":2,"name":"Endurance","min":153,"max":199},{"zone":3,"name":"Tempo","min":200,"max":242},{"zone":4,"name":"Threshold","min":243,"max":285},{"zone":5,"name":"VO2 Max","min":286,"max":342},{"zone":6,"name":"Anaerobic","min":343,"max":399},{"zone":7,"name":"Neuromuscular","min":400,"max":null}]'::jsonb,
   current_date - 120),
  ('d0000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'cycling', 'hr', NULL, 168, 188,
   '[{"zone":1,"name":"Recovery","min":null,"max":136},{"zone":2,"name":"Aerobic","min":137,"max":152},{"zone":3,"name":"Tempo","min":153,"max":163},{"zone":4,"name":"Threshold","min":164,"max":172},{"zone":5,"name":"VO2 Max","min":173,"max":182},{"zone":6,"name":"Anaerobic","min":183,"max":188}]'::jsonb,
   current_date - 120),
  ('d0000003-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000001',
   'running', 'hr', NULL, 172, 192,
   '[{"zone":1,"name":"Easy","min":null,"max":142},{"zone":2,"name":"Aerobic","min":143,"max":158},{"zone":3,"name":"Tempo","min":159,"max":168},{"zone":4,"name":"Threshold","min":169,"max":176},{"zone":5,"name":"VO2 Max","min":177,"max":186},{"zone":6,"name":"Max","min":187,"max":192}]'::jsonb,
   current_date - 120),
  ('d0000004-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000001',
   'swimming', 'hr', NULL, 165, 185,
   '[{"zone":1,"name":"Easy","min":null,"max":138},{"zone":2,"name":"Aerobic","min":139,"max":152},{"zone":3,"name":"Tempo","min":153,"max":163},{"zone":4,"name":"Threshold","min":164,"max":171},{"zone":5,"name":"VO2 Max","min":172,"max":181}]'::jsonb,
   current_date - 120);

INSERT INTO gear (id, user_id, name, sport, type, is_active, total_distance_meters)
VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Canyon Aeroad CF SLX', 'cycling', 'bike', true, 8420000),
  ('e0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Trek Domane SL 6', 'cycling', 'bike', true, 3150000),
  ('e0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Nike Vaporfly 3', 'running', 'shoes', true, 420000),
  ('e0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Asics Gel-Nimbus 25', 'running', 'shoes', false, 680000),
  ('e0000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'Zone3 Aspire Wetsuit', 'swimming', 'wetsuit', true, 0);

-- -----------------------------------------------------------------------------
-- Structured workouts
-- -----------------------------------------------------------------------------

INSERT INTO workouts (
    id, user_id, name, sport, description, estimated_duration_seconds,
    estimated_tss, steps, tags, is_template, is_public, source
) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   'Sweet Spot 2x20', 'cycling',
   '2 x 20 min at 88-93% FTP. Controlled threshold builder.',
   4800, 85,
   '[{"type":"warmup","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}},{"type":"repeat","count":2,"steps":[{"type":"work","duration":{"type":"time","value":1200},"target":{"type":"power_pct","min":88,"max":93}},{"type":"rest","duration":{"type":"time","value":300},"target":{"type":"power_zone","zone":1}}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['cycling','sweet-spot','threshold'], false, true, 'user'),
  ('f0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   'VO2Max Ramp 5x5', 'cycling',
   '5 x 5 min at 110-120% FTP with equal recovery.',
   4500, 95,
   '[{"type":"warmup","duration":{"type":"time","value":900},"target":{"type":"power_zone","zone":2}},{"type":"repeat","count":5,"steps":[{"type":"work","duration":{"type":"time","value":300},"target":{"type":"power_pct","min":110,"max":120}},{"type":"rest","duration":{"type":"time","value":300},"target":{"type":"power_zone","zone":1}}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['cycling','vo2max','hard'], false, true, 'user'),
  ('f0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001',
   'Endurance Base 3h', 'cycling',
   'Long steady aerobic ride in power Zone 2.',
   10800, 120,
   '[{"type":"warmup","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}},{"type":"work","duration":{"type":"time","value":9600},"target":{"type":"power_zone","zone":2}},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['cycling','endurance','z2'], false, true, 'user'),
  ('f0000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001',
   'Easy Run 45min', 'running',
   'Easy aerobic run, conversational pace.',
   2700, 45,
   '[{"type":"warmup","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}},{"type":"work","duration":{"type":"time","value":2100},"target":{"type":"hr_zone","zone":2}},{"type":"cooldown","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['running','easy','z2'], false, true, 'user'),
  ('f0000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001',
   'Brick Run 20min', 'running',
   'Controlled transition run immediately after bike work.',
   1200, 28,
   '[{"type":"work","duration":{"type":"time","value":1200},"target":{"type":"hr_zone","zone":3}}]'::jsonb,
   ARRAY['running','brick','triathlon'], false, true, 'user'),
  ('f0000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001',
   'Interval Track 6x800m', 'running',
   '6 x 800m at VO2 pace with jog recovery.',
   3600, 75,
   '[{"type":"warmup","duration":{"type":"time","value":900},"target":{"type":"hr_zone","zone":2}},{"type":"repeat","count":6,"steps":[{"type":"work","duration":{"type":"distance","value":800},"target":{"type":"hr_zone","zone":5}},{"type":"rest","duration":{"type":"time","value":90},"target":{"type":"hr_zone","zone":1}}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['running','intervals','track'], false, true, 'user'),
  ('f0000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001',
   'Long Run 90min', 'running',
   'Weekly long aerobic run.',
   5400, 95,
   '[{"type":"warmup","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}},{"type":"work","duration":{"type":"time","value":4800},"target":{"type":"hr_zone","zone":2}},{"type":"cooldown","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['running','long-run','endurance'], false, true, 'user'),
  ('f0000020-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001',
   'Open Water Technique 2000m', 'swimming',
   'Technique session with sighting drills.',
   3600, 55,
   '[{"type":"warmup","duration":{"type":"distance","value":400}},{"type":"work","duration":{"type":"distance","value":1200},"description":"Sighting every 10 strokes"},{"type":"work","duration":{"type":"distance","value":400},"description":"Steady finish"}]'::jsonb,
   ARRAY['swimming','technique','triathlon'], false, true, 'user'),
  ('f0000021-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000001',
   'Swim Threshold 10x100m', 'swimming',
   '10 x 100m threshold with 20 sec rest.',
   3000, 65,
   '[{"type":"warmup","duration":{"type":"distance","value":300}},{"type":"repeat","count":10,"steps":[{"type":"work","duration":{"type":"distance","value":100}},{"type":"rest","duration":{"type":"time","value":20}}]},{"type":"cooldown","duration":{"type":"distance","value":200}}]'::jsonb,
   ARRAY['swimming','threshold'], false, true, 'user'),
  ('f0000030-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000001',
   'Triathlete Strength 45min', 'strength',
   'Functional strength for triathletes: core, hip stability, and upper body pull.',
   2700, 35,
   '[{"type":"warmup","duration":{"type":"time","value":300},"description":"Dynamic mobility"},{"type":"work","duration":{"type":"time","value":2100},"description":"3 rounds: squat, single-leg deadlift, hip thrust, pull-up, plank"},{"type":"cooldown","duration":{"type":"time","value":300},"description":"Mobility and breathing"}]'::jsonb,
   ARRAY['strength','triathlon','core','functional'], false, true, 'user');

-- -----------------------------------------------------------------------------
-- Activities. All started_at values are explicit athlete-local instants.
-- -----------------------------------------------------------------------------

INSERT INTO activities (
    id, user_id, source, source_id, sport, sub_sport, name, description,
    started_at, duration_seconds, moving_time_seconds, distance_meters,
    elevation_gain_meters, calories, avg_heart_rate, max_heart_rate,
    avg_power, max_power, normalized_power, intensity_factor, tss,
    avg_cadence, avg_speed, gear_id, weather, extra
) VALUES
  ('ac000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact001', 'cycling', 'road', 'Morning Endurance Ride', NULL,
   ((current_date - 27)::timestamp + time '06:15') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   10920, 10640, 85200, 650, 1820, 142, 168, 188, 312, 196, 0.690, 115, 88, 7.80,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":27,"humidity":78}'::jsonb, '{"local_date_source":"athlete_timezone"}'::jsonb),
  ('ac000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact002', 'running', 'road', 'Easy Morning Run', NULL,
   ((current_date - 26)::timestamp + time '06:35') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   2700, 2600, 7800, 45, 340, 138, 155, NULL, NULL, NULL, NULL, 42, 172, 3.00,
   'e0000003-0000-0000-0000-000000000003',
   '{"temp_c":26}'::jsonb, '{}'::jsonb),
  ('ac000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact003', 'swimming', 'pool', 'Pool Technique 2000m', NULL,
   ((current_date - 25)::timestamp + time '06:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   3480, 3300, 2000, 0, 520, 145, 162, NULL, NULL, NULL, NULL, 55, 52, NULL,
   NULL, '{}'::jsonb, '{}'::jsonb),
  ('ac000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact004', 'cycling', 'road', 'Sweet Spot 2x20', NULL,
   ((current_date - 23)::timestamp + time '17:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   4860, 4750, 36500, 320, 890, 158, 182, 258, 385, 272, 0.950, 88, 90, 7.70,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":29}'::jsonb, '{}'::jsonb),
  ('ac000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001',
   'manual', 'manual_ac000005', 'strength', 'gym', 'Gym Strength Session', 'Matched to Triathlete Strength 45min on the same athlete-local date.',
   ((current_date - 23)::timestamp + time '19:30') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   2700, 2700, 0, 0, 380, 128, 158, NULL, NULL, NULL, NULL, 35, 0, NULL,
   NULL, '{}'::jsonb, '{"activity_local_date_contract":"calendar_events.date"}'::jsonb),
  ('ac000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact006', 'running', 'road', 'Sunday Long Run', NULL,
   ((current_date - 22)::timestamp + time '06:10') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   5340, 5200, 14200, 85, 920, 148, 172, NULL, NULL, NULL, NULL, 92, 175, 2.66,
   'e0000003-0000-0000-0000-000000000003',
   '{"temp_c":25}'::jsonb, '{}'::jsonb),
  ('ac000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact007', 'cycling', 'road', 'Tempo Ride', NULL,
   ((current_date - 20)::timestamp + time '17:15') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   3600, 3540, 27800, 210, 680, 155, 176, 228, 346, 238, 0.840, 64, 88, 7.70,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":30}'::jsonb, '{}'::jsonb),
  ('ac000008-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact008', 'swimming', 'pool', 'Swim Threshold 10x100m', NULL,
   ((current_date - 18)::timestamp + time '06:20') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   3120, 2900, 1800, 0, 480, 158, 174, NULL, NULL, NULL, NULL, 65, 58, NULL,
   NULL, '{}'::jsonb, '{}'::jsonb),
  ('ac000009-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact009', 'cycling', 'road', 'VO2Max 5x5', NULL,
   ((current_date - 16)::timestamp + time '17:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   4520, 4400, 34000, 280, 840, 164, 188, 272, 412, 289, 1.010, 98, 92, 7.70,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":30}'::jsonb, '{}'::jsonb),
  ('ac000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact010', 'running', 'brick', 'Brick Run 13min', NULL,
   ((current_date - 16)::timestamp + time '18:30') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   780, 780, 3200, 10, 180, 155, 168, NULL, NULL, NULL, NULL, 28, 182, 4.10,
   'e0000003-0000-0000-0000-000000000003',
   '{"temp_c":29}'::jsonb, '{}'::jsonb),
  ('ac000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact011', 'running', 'road', 'Long Run 90min', NULL,
   ((current_date - 15)::timestamp + time '06:05') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   5520, 5380, 14800, 92, 960, 150, 170, NULL, NULL, NULL, NULL, 94, 170, 2.68,
   'e0000003-0000-0000-0000-000000000003',
   '{"temp_c":25}'::jsonb, '{}'::jsonb),
  ('ac000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact012', 'cycling', 'road', 'Endurance Ride 3h', NULL,
   ((current_date - 13)::timestamp + time '06:20') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   10740, 10500, 83000, 620, 1790, 144, 170, 182, 298, 191, 0.670, 111, 87, 7.80,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":26}'::jsonb, '{}'::jsonb),
  ('ac000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact013', 'running', 'road', 'Easy Run', NULL,
   ((current_date - 12)::timestamp + time '06:45') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   2680, 2600, 7500, 38, 330, 136, 151, NULL, NULL, NULL, NULL, 42, 174, 2.81,
   'e0000004-0000-0000-0000-000000000004',
   '{"temp_c":26}'::jsonb, '{}'::jsonb),
  ('ac000014-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000001',
   'manual', 'manual_ac000014', 'strength', 'gym', 'Strength and Core', NULL,
   ((current_date - 11)::timestamp + time '18:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   2820, 2820, 0, 0, 390, 132, 162, NULL, NULL, NULL, NULL, 35, 0, NULL,
   NULL, '{}'::jsonb, '{}'::jsonb),
  ('ac000015-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact015', 'cycling', 'road', 'Sweet Spot 2x20 - Felt Strong', NULL,
   ((current_date - 9)::timestamp + time '17:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   4820, 4720, 37200, 330, 895, 160, 184, 262, 388, 275, 0.970, 91, 90, 7.70,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":31}'::jsonb, '{}'::jsonb),
  ('ac000016-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact016', 'running', 'track', '6x800m Track Session', NULL,
   ((current_date - 5)::timestamp + time '17:45') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   3680, 3440, 11200, 28, 680, 162, 186, NULL, NULL, NULL, NULL, 72, 178, 3.04,
   'e0000003-0000-0000-0000-000000000003',
   '{"temp_c":29}'::jsonb, '{}'::jsonb),
  ('ac000017-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact017', 'swimming', 'pool', 'Swim Threshold', NULL,
   ((current_date - 4)::timestamp + time '06:10') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   3080, 2920, 1750, 0, 462, 156, 172, NULL, NULL, NULL, NULL, 58, 58, NULL,
   NULL, '{}'::jsonb, '{}'::jsonb),
  ('ac000018-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact018', 'cycling', 'road', 'VO2Max 5x5 - Tough Day', NULL,
   ((current_date - 2)::timestamp + time '17:10') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   4480, 4360, 33500, 275, 820, 166, 190, 268, 408, 283, 0.990, 93, 91, 7.70,
   'e0000001-0000-0000-0000-000000000001',
   '{"temp_c":30}'::jsonb, '{}'::jsonb),
  ('ac000019-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000001',
   'garmin', 'gact019', 'cycling', 'road', 'Base Endurance Ride', 'Unplanned ride kept as a standalone activity card.',
   ((current_date - 1)::timestamp + time '06:30') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   10800, 10600, 84500, 640, 1840, 143, 169, 185, 305, 194, 0.680, 113, 88, 7.83,
   'e0000002-0000-0000-0000-000000000002',
   '{"temp_c":27}'::jsonb, '{"standalone_calendar_event":true}'::jsonb);

-- A representative subset of stream/lap data is enough for charts and details.
INSERT INTO activity_streams (
    id, activity_id, timestamps, heart_rate, power, cadence, speed, distance, temperature
) VALUES
  ('a5000001-0000-0000-0000-000000000001', 'ac000004-0000-0000-0000-000000000004',
   ARRAY[0,300,600,900,1200,1500,1800,2100,2400,2700,3000,3300,3600,3900,4200,4500,4860],
   ARRAY[105,128,146,158,164,166,137,155,164,167,138,151,160,166,139,128,112]::smallint[],
   ARRAY[120,185,238,258,264,260,132,242,261,266,128,230,258,262,135,120,90]::smallint[],
   ARRAY[82,88,91,92,91,90,85,90,91,92,84,89,91,90,85,82,78]::smallint[],
   ARRAY[5.8,7.1,8.0,8.3,8.2,8.1,6.2,8.0,8.2,8.2,6.1,7.9,8.1,8.0,6.0,5.5,4.2]::real[],
   ARRAY[0,2100,4500,7100,9600,12100,13900,16500,19000,21500,23200,25800,28400,30900,32800,35000,36500]::real[],
   ARRAY[29,29,29,30,30,30,30,30,31,31,31,31,31,31,30,30,29]::smallint[]),
  ('a5000002-0000-0000-0000-000000000002', 'ac000016-0000-0000-0000-000000000016',
   ARRAY[0,300,600,900,1200,1500,1800,2100,2400,2700,3000,3300,3600],
   ARRAY[110,132,150,170,182,145,172,185,148,173,186,154,135]::smallint[],
   NULL,
   ARRAY[160,168,172,178,182,166,180,184,168,181,185,170,162]::smallint[],
   ARRAY[2.1,2.7,3.0,3.4,3.7,2.5,3.5,3.8,2.4,3.5,3.8,2.6,2.2]::real[],
   ARRAY[0,760,1600,2600,3700,4450,5600,6750,7500,8650,9800,10500,11200]::real[],
   ARRAY[29,29,29,29,30,30,30,30,30,30,30,29,29]::smallint[]);

INSERT INTO activity_laps (
    id, activity_id, lap_index, start_time, duration_seconds, distance_meters,
    avg_heart_rate, max_heart_rate, avg_power, max_power, avg_cadence, elevation_gain
) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'ac000004-0000-0000-0000-000000000004', 0,
   ((current_date - 23)::timestamp + time '17:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   600, 4500, 128, 146, 185, 238, 88, 40),
  ('a1000002-0000-0000-0000-000000000002', 'ac000004-0000-0000-0000-000000000004', 1,
   ((current_date - 23)::timestamp + time '17:10') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   1200, 9700, 164, 182, 262, 385, 91, 110),
  ('a1000003-0000-0000-0000-000000000003', 'ac000004-0000-0000-0000-000000000004', 2,
   ((current_date - 23)::timestamp + time '17:30') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   300, 1700, 137, 150, 132, 210, 85, 20),
  ('a1000004-0000-0000-0000-000000000004', 'ac000004-0000-0000-0000-000000000004', 3,
   ((current_date - 23)::timestamp + time '17:35') AT TIME ZONE 'Asia/Ho_Chi_Minh',
   1200, 9600, 165, 184, 264, 388, 91, 105);

-- -----------------------------------------------------------------------------
-- Calendar. Every linked activity is on the same athlete-local date as its event.
-- Standalone activity cards use workout_id NULL and are intentionally non-draggable.
-- -----------------------------------------------------------------------------

INSERT INTO calendar_events (
    id, user_id, date, event_type, workout_id, activity_id, title, description,
    status, order_index, compliance_score, garmin_workout_id, garmin_scheduled_id, garmin_synced_at
) VALUES
  ('ce000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   current_date - 27, 'workout', 'f0000003-0000-0000-0000-000000000003', 'ac000001-0000-0000-0000-000000000001',
   'Endurance Base 3h', 'Coach: build aerobic base', 'completed', 0, 92.5, NULL, NULL, NULL),
  ('ce000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   current_date - 26, 'workout', 'f0000010-0000-0000-0000-000000000010', 'ac000002-0000-0000-0000-000000000002',
   'Easy Run 45min', NULL, 'completed', 0, 100.0, NULL, NULL, NULL),
  ('ce000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001',
   current_date - 25, 'workout', 'f0000020-0000-0000-0000-000000000020', 'ac000003-0000-0000-0000-000000000003',
   'Open Water Technique 2000m', NULL, 'completed', 0, 88.0, NULL, NULL, NULL),
  ('ce000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001',
   current_date - 24, 'rest', NULL, NULL, 'Rest Day', 'Active recovery only', 'completed', 0, NULL, NULL, NULL, NULL),
  ('ce000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001',
   current_date - 23, 'workout', 'f0000001-0000-0000-0000-000000000001', 'ac000004-0000-0000-0000-000000000004',
   'Sweet Spot 2x20', 'Assigned by coach Sarah', 'completed', 0, 95.0, NULL, NULL, NULL),
  ('ce000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001',
   current_date - 23, 'workout', 'f0000030-0000-0000-0000-000000000030', 'ac000005-0000-0000-0000-000000000005',
   'Triathlete Strength 45min', 'Regression case: moving this away then back must relink ac000005.', 'completed', 1, 100.0, NULL, NULL, NULL),
  ('ce000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001',
   current_date - 22, 'workout', 'f0000013-0000-0000-0000-000000000013', 'ac000006-0000-0000-0000-000000000006',
   'Long Run 90min', NULL, 'completed', 0, 87.0, NULL, NULL, NULL),
  ('ce000008-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001',
   current_date - 20, 'workout', 'f0000003-0000-0000-0000-000000000003', NULL,
   'Endurance Base 3h', 'Skipped due to fatigue', 'skipped', 0, NULL, NULL, NULL, NULL),
  ('ce000009-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001',
   current_date - 20, 'workout', 'f0000001-0000-0000-0000-000000000001', 'ac000007-0000-0000-0000-000000000007',
   'Tempo Ride 60min', NULL, 'partial', 1, 64.0, NULL, NULL, NULL),
  ('ce000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001',
   current_date - 18, 'workout', 'f0000021-0000-0000-0000-000000000021', 'ac000008-0000-0000-0000-000000000008',
   'Swim Threshold 10x100m', NULL, 'completed', 0, 90.0, NULL, NULL, NULL),
  ('ce000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001',
   current_date - 16, 'workout', 'f0000002-0000-0000-0000-000000000002', 'ac000009-0000-0000-0000-000000000009',
   'VO2Max Ramp 5x5', 'Push the limits today', 'completed', 0, 82.0, NULL, NULL, NULL),
  ('ce000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001',
   current_date - 16, 'workout', 'f0000011-0000-0000-0000-000000000011', 'ac000010-0000-0000-0000-000000000010',
   'Brick Run 20min', NULL, 'partial', 1, 65.0, NULL, NULL, NULL),
  ('ce000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001',
   current_date - 15, 'workout', 'f0000013-0000-0000-0000-000000000013', 'ac000011-0000-0000-0000-000000000011',
   'Long Run 90min', 'Weekly long run', 'completed', 0, 94.0, NULL, NULL, NULL),
  ('ce000014-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000001',
   current_date - 13, 'workout', 'f0000003-0000-0000-0000-000000000003', 'ac000012-0000-0000-0000-000000000012',
   'Endurance Base 3h', NULL, 'completed', 0, 89.0, NULL, NULL, NULL),
  ('ce000015-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000001',
   current_date - 12, 'workout', 'f0000010-0000-0000-0000-000000000010', 'ac000013-0000-0000-0000-000000000013',
   'Easy Run 45min', NULL, 'completed', 0, 100.0, NULL, NULL, NULL),
  ('ce000016-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000001',
   current_date - 11, 'workout', 'f0000030-0000-0000-0000-000000000030', 'ac000014-0000-0000-0000-000000000014',
   'Triathlete Strength 45min', NULL, 'completed', 0, 100.0, NULL, NULL, NULL),
  ('ce000017-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000001',
   current_date - 9, 'workout', 'f0000001-0000-0000-0000-000000000001', 'ac000015-0000-0000-0000-000000000015',
   'Sweet Spot 2x20', NULL, 'completed', 0, 96.5, NULL, NULL, NULL),
  ('ce000018-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000001',
   current_date - 5, 'workout', 'f0000012-0000-0000-0000-000000000012', 'ac000016-0000-0000-0000-000000000016',
   'Interval Track 6x800m', NULL, 'completed', 0, 97.0, NULL, NULL, NULL),
  ('ce000019-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000001',
   current_date - 4, 'workout', 'f0000021-0000-0000-0000-000000000021', 'ac000017-0000-0000-0000-000000000017',
   'Swim Threshold 10x100m', NULL, 'completed', 0, 92.0, NULL, NULL, NULL),
  ('ce000020-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001',
   current_date - 2, 'workout', 'f0000002-0000-0000-0000-000000000002', 'ac000018-0000-0000-0000-000000000018',
   'VO2Max Ramp 5x5', NULL, 'completed', 0, 99.0, NULL, NULL, NULL),
  ('ce000021-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000001',
   current_date - 1, 'workout', NULL, 'ac000019-0000-0000-0000-000000000019',
   'Base Endurance Ride', 'Standalone actual activity; no planned workout owns this activity.', 'completed', 0, NULL, NULL, NULL, NULL),
  ('ce000022-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000001',
   current_date, 'workout', 'f0000010-0000-0000-0000-000000000010', NULL,
   'Easy Run 45min', 'Today: keep it easy', 'planned', 0, NULL, 'gw_demo_001', 'gs_demo_001', now() - interval '1 day'),
  ('ce000023-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000001',
   current_date, 'workout', 'f0000030-0000-0000-0000-000000000030', NULL,
   'Triathlete Strength 45min', 'Today: light core after run', 'planned', 1, NULL, NULL, NULL, NULL),
  ('ce000024-0000-0000-0000-000000000024', 'a0000001-0000-0000-0000-000000000001',
   current_date + 1, 'workout', 'f0000020-0000-0000-0000-000000000020', NULL,
   'Open Water Technique 2000m', NULL, 'planned', 0, NULL, NULL, NULL, NULL),
  ('ce000025-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000001',
   current_date + 2, 'workout', 'f0000001-0000-0000-0000-000000000001', NULL,
   'Sweet Spot 2x20', NULL, 'planned', 0, NULL, NULL, NULL, NULL),
  ('ce000026-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000001',
   current_date + 3, 'note', NULL, NULL,
   'Travel Day', 'Keep training flexible; timezone remains athlete profile timezone.', 'planned', 0, NULL, NULL, NULL, NULL),
  ('ce000027-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000001',
   current_date + 4, 'workout', 'f0000013-0000-0000-0000-000000000013', NULL,
   'Long Run 90min', NULL, 'planned', 0, NULL, NULL, NULL, NULL),
  ('ce000028-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000001',
   current_date + 7, 'race', NULL, NULL,
   'Olympic Triathlon Tune-up', 'B race: validate pacing and nutrition', 'planned', 0, NULL, NULL, NULL, NULL);

-- -----------------------------------------------------------------------------
-- Health, wellness, training load
-- -----------------------------------------------------------------------------

INSERT INTO wellness_logs (
    id, user_id, date, source, mood, rpe, sleep_quality, sleep_hours,
    fatigue, soreness, stress_level, resting_hr, hrv, weight_kg, notes, field_sources
)
SELECT
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    current_date - s,
    'manual',
    CASE WHEN s % 7 IN (0, 1) THEN 4 ELSE 3 END,
    CASE WHEN s % 7 IN (2, 5) THEN 7 ELSE 4 END,
    CASE WHEN s % 9 = 0 THEN 2 ELSE 4 END,
    ROUND((6.7 + ((s % 5)::numeric * 0.25))::numeric, 1),
    CASE WHEN s % 7 IN (2, 5) THEN 4 ELSE 2 END,
    CASE WHEN s % 7 IN (2, 5) THEN 3 ELSE 1 END,
    CASE WHEN s % 11 = 0 THEN 4 ELSE 2 END,
    46 + (s % 5),
    ROUND((58 + ((s % 9)::numeric * 1.7))::numeric, 2),
    ROUND((68.2 + (((s % 6)::numeric - 3) * 0.15))::numeric, 2),
    CASE WHEN s = 0 THEN 'Feeling normal; ready to train.' ELSE NULL END,
    '{"resting_hr":"garmin","hrv":"garmin","sleep_hours":"garmin","mood":"manual"}'::jsonb
FROM generate_series(0, 29) AS s;

INSERT INTO health_daily_summaries (
    id, user_id, date, source, steps, distance_meters, calories_total,
    calories_active, active_minutes, intensity_minutes, floors_climbed,
    resting_hr, avg_hr, max_hr, avg_stress, max_stress, body_battery_high,
    body_battery_low, avg_spo2, avg_respiration, vo2max, weight_kg,
    body_fat_pct, muscle_mass_kg, bone_mass_kg, bmi, extra
)
SELECT
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    current_date - s,
    'garmin',
    6500 + ((30 - s) * 120) + (s % 4) * 900,
    5200 + ((30 - s) * 85),
    2150 + (s % 6) * 85,
    450 + (s % 7) * 70,
    55 + (s % 5) * 12,
    38 + (s % 4) * 10,
    4 + (s % 8),
    46 + (s % 5),
    78 + (s % 8),
    151 + (s % 22),
    31 + (s % 16),
    66 + (s % 25),
    82 - (s % 15),
    28 + (s % 18),
    96.5,
    14.2 + ((s % 4)::numeric * 0.1),
    57.5,
    ROUND((68.2 + (((s % 6)::numeric - 3) * 0.15))::numeric, 2),
    13.8,
    56.1,
    3.1,
    22.3,
    jsonb_build_object('timezone', 'Asia/Ho_Chi_Minh', 'local_date', (current_date - s)::text)
FROM generate_series(0, 29) AS s;

INSERT INTO health_sleep_data (
    id, user_id, date, source, sleep_start, sleep_end, duration_seconds,
    deep_seconds, light_seconds, rem_seconds, awake_seconds, sleep_score,
    avg_respiration, avg_spo2, avg_hrv, hrv_status, extra
)
SELECT
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    current_date - s,
    'garmin',
    ((current_date - s - 1)::timestamp + time '22:45') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    ((current_date - s)::timestamp + time '06:10') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    26700,
    5400 + (s % 4) * 300,
    14400 + (s % 5) * 420,
    5400 + (s % 3) * 360,
    1200 + (s % 4) * 180,
    72 + (s % 17),
    14.0 + ((s % 5)::numeric * 0.1),
    96.3,
    58.0 + ((s % 6)::numeric * 1.2),
    CASE WHEN s % 9 = 0 THEN 'low' ELSE 'balanced' END,
    jsonb_build_object('wakeup_date_contract', 'date is athlete local wakeup date')
FROM generate_series(0, 29) AS s;

INSERT INTO health_epoch_summaries (
    id, user_id, date, epoch_start, duration_seconds, source,
    steps, active_calories, met, intensity, moving_duration_sec,
    distance_meters, extra
)
SELECT
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    current_date,
    (current_date::timestamp + time '06:00' + (i * interval '15 minutes')) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    900,
    'garmin',
    CASE WHEN i BETWEEN 2 AND 5 THEN 950 ELSE 80 + i * 7 END,
    CASE WHEN i BETWEEN 2 AND 5 THEN 85 ELSE 8 END,
    CASE WHEN i BETWEEN 2 AND 5 THEN 7.2 ELSE 1.3 END,
    CASE WHEN i BETWEEN 2 AND 5 THEN 'HIGHLY_ACTIVE' ELSE 'SEDENTARY' END,
    CASE WHEN i BETWEEN 2 AND 5 THEN 780 ELSE 90 END,
    CASE WHEN i BETWEEN 2 AND 5 THEN 1200 ELSE 65 END,
    '{}'::jsonb
FROM generate_series(0, 47) AS i;

INSERT INTO training_load (id, user_id, date, sport, daily_tss, ctl, atl, tsb, is_dirty)
SELECT
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    current_date - s,
    sport,
    CASE sport
      WHEN 'cycling' THEN CASE WHEN s IN (27,23,20,16,13,9,2,1) THEN 90 ELSE 0 END
      WHEN 'running' THEN CASE WHEN s IN (26,22,16,15,12,5,0) THEN 55 ELSE 0 END
      WHEN 'swimming' THEN CASE WHEN s IN (25,18,4) THEN 58 ELSE 0 END
      WHEN 'strength' THEN CASE WHEN s IN (23,11,0) THEN 35 ELSE 0 END
      ELSE CASE
             WHEN s IN (27,23,20,16,13,9,2,1) THEN 90
             WHEN s IN (26,22,15,12,5,0) THEN 55
             WHEN s IN (25,18,4) THEN 58
             WHEN s IN (11) THEN 35
             ELSE 0
           END
    END,
    ROUND((64 + ((60 - s)::numeric / 60 * 18))::numeric, 1),
    ROUND((70 + ((s % 7)::numeric * 4))::numeric, 1),
    ROUND(((64 + ((60 - s)::numeric / 60 * 18)) - (70 + ((s % 7)::numeric * 4)))::numeric, 1),
    false
FROM generate_series(0, 59) AS s
CROSS JOIN (VALUES ('all'), ('cycling'), ('running'), ('swimming'), ('strength')) AS sports(sport);

-- -----------------------------------------------------------------------------
-- Sync and async workflow examples
-- -----------------------------------------------------------------------------

INSERT INTO sync_logs (
    id, user_id, provider, event_type, status, source_id,
    activity_id, error_message, payload, processed_at, created_at
) VALUES
  ('51000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'garmin', 'activity_created', 'success', 'gact018',
   'ac000018-0000-0000-0000-000000000018',
   NULL,
   '{"summaryId":"gact018","type":"activity"}'::jsonb,
   now() - interval '2 days',
   now() - interval '2 days'),
  ('51000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'garmin', 'health_daily_push', 'success', 'health_daily_today',
   NULL,
   NULL,
   '{"calendarDate":"today","timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   now() - interval '2 hours',
   now() - interval '2 hours'),
  ('51000003-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000001',
   'garmin', 'activity_details_push', 'pending', 'orphan_summary_demo',
   NULL,
   'Parent activity summary has not arrived yet',
   '{"summaryId":"orphan_summary_demo"}'::jsonb,
   NULL,
   now() - interval '30 minutes');

INSERT INTO activity_details_staging (
    id, user_id, source, summary_id, payload_json, sync_log_id,
    status, attempt_count, last_error, created_at
) VALUES
  ('57000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'garmin',
   'orphan_summary_demo',
   '{"summaryId":"orphan_summary_demo","samples":[]}',
   '51000003-0000-0000-0000-000000000003',
   'pending',
   1,
   'Waiting for activity summary',
   now() - interval '30 minutes');

INSERT INTO export_jobs (id, user_id, status, file_url, created_at, expires_at)
VALUES
  ('e1000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'DONE',
   'https://example.local/exports/minh-demo.zip',
   now() - interval '2 days',
   now() + interval '5 days');

COMMIT;
