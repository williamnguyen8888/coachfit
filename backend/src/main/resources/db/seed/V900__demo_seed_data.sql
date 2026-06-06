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

-- No calendar events seeded (starts empty)


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

-- No training load seeded (starts empty)

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
   NULL,
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
