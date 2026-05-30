-- =============================================================================
-- CoachFit Demo Seed Data — V900__demo_seed_data.sql
-- =============================================================================
-- Persona:  Nguyen Van Minh — Advanced triathlete, 30 y/o, 68 kg, FTP 285W
-- Coach:    Sarah Thompson — Elite coach account
-- Password: Demo@1234  (bcrypt $2a$12$...)
-- Run:      psql -U coachfit -d coachfit_dev -f V900__demo_seed_data.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, onboarding_completed, settings, created_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001',
   'minh@demo.coachfit.app',
   '$2b$12$2qYL9m5LWjkwP5U1zmQKlukBtado7LIWNI4Y0FJhc2PmFt2v/RL5C',
   'Nguyen Van Minh',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=minh',
   'athlete', true,
   '{"locale":"vi","units":"metric","timezone":"Asia/Ho_Chi_Minh","theme":"dark"}'::jsonb,
   now() - interval '180 days'),

  ('a0000002-0000-0000-0000-000000000002',
   'coach@demo.coachfit.app',
   '$2b$12$2qYL9m5LWjkwP5U1zmQKlukBtado7LIWNI4Y0FJhc2PmFt2v/RL5C',
   'Sarah Thompson',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
   'coach', true,
   '{"locale":"en","units":"metric","timezone":"America/New_York","theme":"dark"}'::jsonb,
   now() - interval '365 days')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO subscriptions (id, user_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end)
VALUES
  ('b0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'pro', 'active', 'cus_demo_minh', 'sub_demo_minh',
   now() - interval '15 days', now() + interval '15 days'),
  ('b0000002-0000-0000-0000-000000000002',
   'a0000002-0000-0000-0000-000000000002',
   'elite', 'active', 'cus_demo_sarah', 'sub_demo_sarah',
   now() - interval '1 day', now() + interval '29 days')
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATHLETE PROFILE
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO athlete_profiles (id, user_id, date_of_birth, gender, weight_kg, height_cm, sports, experience_level, primary_sport, primary_health_source)
VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   '1994-03-15', 'male', 68.2, 175.0,
   ARRAY['cycling','running','swimming'],
   'advanced', 'cycling', 'garmin')
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SPORT ZONES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO sport_zones (id, user_id, sport, zone_type, ftp, lthr, max_hr, zones, effective_date)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'cycling', 'power', 285, NULL, NULL,
   '[{"zone":1,"name":"Active Recovery","min":null,"max":152},{"zone":2,"name":"Endurance","min":153,"max":199},{"zone":3,"name":"Tempo","min":200,"max":242},{"zone":4,"name":"Threshold","min":243,"max":285},{"zone":5,"name":"VO2 Max","min":286,"max":342},{"zone":6,"name":"Anaerobic","min":343,"max":399},{"zone":7,"name":"Neuromuscular","min":400,"max":null}]'::jsonb,
   (current_date - 90)::date),

  ('d0000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'cycling', 'hr', NULL, 168, 188,
   '[{"zone":1,"name":"Recovery","min":null,"max":136},{"zone":2,"name":"Aerobic","min":137,"max":152},{"zone":3,"name":"Tempo","min":153,"max":163},{"zone":4,"name":"Threshold","min":164,"max":172},{"zone":5,"name":"VO2 Max","min":173,"max":182},{"zone":6,"name":"Anaerobic","min":183,"max":188}]'::jsonb,
   (current_date - 90)::date),

  ('d0000003-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000001',
   'running', 'hr', NULL, 172, 192,
   '[{"zone":1,"name":"Easy","min":null,"max":142},{"zone":2,"name":"Aerobic","min":143,"max":158},{"zone":3,"name":"Tempo","min":159,"max":168},{"zone":4,"name":"Threshold","min":169,"max":176},{"zone":5,"name":"VO2 Max","min":177,"max":186},{"zone":6,"name":"Max","min":187,"max":192}]'::jsonb,
   (current_date - 90)::date),

  ('d0000004-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000001',
   'swimming', 'hr', NULL, 165, 185,
   '[{"zone":1,"name":"Easy","min":null,"max":138},{"zone":2,"name":"Aerobic","min":139,"max":152},{"zone":3,"name":"Tempo","min":153,"max":163},{"zone":4,"name":"Threshold","min":164,"max":171},{"zone":5,"name":"VO2 Max","min":172,"max":181}]'::jsonb,
   (current_date - 90)::date)
ON CONFLICT (user_id, sport, zone_type, effective_date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. GEAR
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO gear (id, user_id, name, sport, type, is_active, total_distance_meters)
VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Canyon Aeroad CF SLX', 'cycling', 'bike',   true, 8420000),
  ('e0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Trek Domane SL 6',     'cycling', 'bike',   true, 3150000),
  ('e0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Nike Vaporfly 3',      'running', 'shoes',  true,  420000),
  ('e0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Asics Gel-Nimbus 25',  'running', 'shoes',  false, 680000)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. WORKOUTS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO workouts (id, user_id, name, sport, description, estimated_duration_seconds, estimated_tss, steps, tags, is_template, is_public, source)
VALUES
  -- Cycling
  ('f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   'Sweet Spot 2x20', 'cycling',
   '2 x 20 min at 88-93% FTP (250-265W). Classic threshold builder with low fatigue cost. Core of any polarised plan.',
   4800, 85,
   '[{"type":"warmup","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1},"description":"Easy spin, gradually build"},{"type":"repeat","count":2,"steps":[{"type":"work","duration":{"type":"time","value":1200},"target":{"type":"power_pct","min":88,"max":93},"description":"Sweet spot — feel controlled but working"},{"type":"rest","duration":{"type":"time","value":300},"target":{"type":"power_zone","zone":1},"description":"Easy recovery"}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1},"description":"Easy spin out"}]'::jsonb,
   ARRAY['sweet-spot','threshold','cycling'], false, true, 'user'),

  ('f0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   'VO2Max Ramp 5x5', 'cycling',
   '5 x 5 min at 110-120% FTP with 5 min recovery. Boost your aerobic ceiling. Painful but essential.',
   4500, 95,
   '[{"type":"warmup","duration":{"type":"time","value":900},"target":{"type":"power_zone","zone":2}},{"type":"repeat","count":5,"steps":[{"type":"work","duration":{"type":"time","value":300},"target":{"type":"power_pct","min":110,"max":120},"description":"All out — breathing heavy"},{"type":"rest","duration":{"type":"time","value":300},"target":{"type":"power_zone","zone":1},"description":"Full recovery"}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['vo2max','intervals','cycling','hard'], false, true, 'user'),

  ('f0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001',
   'Endurance Base 3h', 'cycling',
   'Long steady aerobic ride. Power Zone 2 (153-199W), heart rate conversational. Foundation of fitness.',
   10800, 120,
   '[{"type":"warmup","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}},{"type":"work","duration":{"type":"time","value":9600},"target":{"type":"power_zone","zone":2},"description":"Steady Z2, never go above 200W"},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['endurance','z2','aerobic','cycling','long'], false, true, 'user'),

  ('f0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001',
   'Tempo Ride 60min', 'cycling',
   '40 min at Zone 3 (200-242W). Improve sustained power. Comfortably hard.',
   3600, 65,
   '[{"type":"warmup","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":2}},{"type":"work","duration":{"type":"time","value":2400},"target":{"type":"power_zone","zone":3},"description":"Tempo — comfortably hard"},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"power_zone","zone":1}}]'::jsonb,
   ARRAY['tempo','cycling'], false, true, 'user'),

  -- Running
  ('f0000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001',
   'Easy Run 45min', 'running',
   'Easy aerobic run, heart rate Zone 1-2 (max 152 bpm). Conversational pace. Pure aerobic base building.',
   2700, 45,
   '[{"type":"warmup","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1},"description":"Walk/easy jog"},{"type":"work","duration":{"type":"time","value":2100},"target":{"type":"hr_zone","zone":2},"description":"Easy conversational pace"},{"type":"cooldown","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['easy','running','z2','recovery'], false, true, 'user'),

  ('f0000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001',
   'Brick Run 20min (off bike)', 'running',
   'Off the bike transition run. Legs will feel like bricks — that is the point! Keep easy pace.',
   1200, 28,
   '[{"type":"work","duration":{"type":"time","value":1200},"target":{"type":"hr_zone","zone":3},"description":"Run immediately off bike, control HR"}]'::jsonb,
   ARRAY['brick','run','triathlon','transition'], false, true, 'user'),

  ('f0000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001',
   'Interval Track 6x800m', 'running',
   '6 x 800m at VO2max pace with 90 sec recovery jog. Sharpens speed and raises aerobic ceiling.',
   3600, 75,
   '[{"type":"warmup","duration":{"type":"time","value":900},"target":{"type":"hr_zone","zone":2}},{"type":"repeat","count":6,"steps":[{"type":"work","duration":{"type":"distance","value":800},"target":{"type":"hr_zone","zone":5},"description":"VO2max effort"},{"type":"rest","duration":{"type":"time","value":90},"target":{"type":"hr_zone","zone":1},"description":"Easy jog recovery"}]},{"type":"cooldown","duration":{"type":"time","value":600},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['intervals','track','running','vo2max'], false, true, 'user'),

  ('f0000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001',
   'Long Run 90min', 'running',
   'Weekly long aerobic run. Build endurance and fat adaptation. Heart Rate Zone 2 throughout.',
   5400, 95,
   '[{"type":"warmup","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}},{"type":"work","duration":{"type":"time","value":4800},"target":{"type":"hr_zone","zone":2},"description":"Easy aerobic — talk test"},{"type":"cooldown","duration":{"type":"time","value":300},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['long-run','running','endurance'], false, true, 'user'),

  -- Swimming
  ('f0000020-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001',
   'Open Water Technique 2000m', 'swimming',
   'Technique-focused session. Steady aerobic swimming with sighting drills. Essential triathlon prep.',
   3600, 55,
   '[{"type":"warmup","duration":{"type":"distance","value":400},"target":{"type":"hr_zone","zone":1},"description":"Easy freestyle"},{"type":"work","duration":{"type":"distance","value":1200},"target":{"type":"hr_zone","zone":3},"description":"Steady aerobic — sight every 10 strokes"},{"type":"rest","duration":{"type":"time","value":120},"target":{"type":"open"}},{"type":"work","duration":{"type":"distance","value":400},"target":{"type":"hr_zone","zone":4},"description":"Threshold pace"},{"type":"cooldown","duration":{"type":"distance","value":200},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['swimming','technique','aerobic','triathlon'], false, true, 'user'),

  ('f0000021-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000001',
   'Swim Threshold 10x100m', 'swimming',
   '10 x 100m at threshold pace with 20 sec rest. Improves lactate threshold in the water.',
   3000, 65,
   '[{"type":"warmup","duration":{"type":"distance","value":300},"target":{"type":"hr_zone","zone":1}},{"type":"repeat","count":10,"steps":[{"type":"work","duration":{"type":"distance","value":100},"target":{"type":"hr_zone","zone":4},"description":"Hard but controlled"},{"type":"rest","duration":{"type":"time","value":20},"target":{"type":"open"}}]},{"type":"cooldown","duration":{"type":"distance","value":200},"target":{"type":"hr_zone","zone":1}}]'::jsonb,
   ARRAY['swimming','threshold','intervals'], false, true, 'user'),

  -- Strength
  ('f0000030-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000001',
   'Triathlete Strength 45min', 'strength',
   'Functional strength for triathletes. Core, hip stability, upper body pull. Minimal eccentric to avoid DOMS.',
   2700, 35,
   '[{"type":"warmup","duration":{"type":"time","value":300},"description":"Dynamic mobility"},{"type":"work","duration":{"type":"time","value":2100},"description":"3 rounds: 15x goblet squat, 12x single-leg deadlift, 15x hip thrust, 10x pull-up, 30s plank"},{"type":"cooldown","duration":{"type":"time","value":300},"description":"Static stretch: hip flexors, hamstrings, lats"}]'::jsonb,
   ARRAY['strength','triathlon','core','functional'], false, true, 'user')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CALENDAR EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO calendar_events (id, user_id, date, event_type, workout_id, title, description, status, order_index, compliance_score)
VALUES
  -- Week -4 (all completed)
  ('ce000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', current_date-27, 'workout', 'f0000003-0000-0000-0000-000000000003', 'Endurance Base 3h',        'Coach: Build your aerobic base',        'completed', 0, 92.5),
  ('ce000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', current_date-26, 'workout', 'f0000010-0000-0000-0000-000000000010', 'Easy Run 45min',            NULL,                                    'completed', 0, 100.0),
  ('ce000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', current_date-25, 'workout', 'f0000020-0000-0000-0000-000000000020', 'Open Water Technique 2000m',NULL,                                    'completed', 0, 88.0),
  ('ce000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', current_date-24, 'rest',    NULL,                                    'Rest Day',                  'Active recovery — light walk only',     'completed', 0, NULL),
  ('ce000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', current_date-23, 'workout', 'f0000001-0000-0000-0000-000000000001', 'Sweet Spot 2x20',           'Assigned by coach Sarah',               'completed', 0, 95.0),
  ('ce000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', current_date-23, 'workout', 'f0000030-0000-0000-0000-000000000030', 'Triathlete Strength 45min', NULL,                                    'completed', 1, 100.0),
  ('ce000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', current_date-22, 'workout', 'f0000013-0000-0000-0000-000000000013', 'Long Run 90min',            NULL,                                    'completed', 0, 87.0),
  ('ce000008-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', current_date-21, 'rest',    NULL,                                    'Rest Day',                  NULL,                                    'completed', 0, NULL),

  -- Week -3 (1 skipped due to illness, 1 partial)
  ('ce000009-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', current_date-20, 'workout', 'f0000004-0000-0000-0000-000000000004', 'Tempo Ride 60min',          NULL,                                    'completed', 0, 98.0),
  ('ce000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', current_date-19, 'workout', 'f0000012-0000-0000-0000-000000000012', 'Interval Track 6x800m',    NULL,                                    'skipped',   0, NULL),
  ('ce000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001', current_date-18, 'workout', 'f0000021-0000-0000-0000-000000000021', 'Swim Threshold 10x100m',   NULL,                                    'completed', 0, 90.0),
  ('ce000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001', current_date-17, 'note',    NULL,                                    'HRV Drop — Extra Rest',    'HRV dropped to 42ms. Extra rest added.','completed', 0, NULL),
  ('ce000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001', current_date-16, 'workout', 'f0000002-0000-0000-0000-000000000002', 'VO2Max Ramp 5x5',          'Push the limits today',                 'completed', 0, 82.0),
  ('ce000014-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000001', current_date-16, 'workout', 'f0000011-0000-0000-0000-000000000011', 'Brick Run 20min',          NULL,                                    'partial',   1, 65.0),
  ('ce000015-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000001', current_date-15, 'workout', 'f0000013-0000-0000-0000-000000000013', 'Long Run 90min',            'Weekly long run',                       'completed', 0, 94.0),
  ('ce000016-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000001', current_date-14, 'rest',    NULL,                                    'Rest Day',                  NULL,                                    'completed', 0, NULL),

  -- Week -2 (1 skipped long run)
  ('ce000017-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000001', current_date-13, 'workout', 'f0000003-0000-0000-0000-000000000003', 'Endurance Base 3h',        NULL,                                    'completed', 0, 89.0),
  ('ce000018-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000001', current_date-12, 'workout', 'f0000010-0000-0000-0000-000000000010', 'Easy Run 45min',            NULL,                                    'completed', 0, 100.0),
  ('ce000019-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000001', current_date-11, 'workout', 'f0000020-0000-0000-0000-000000000020', 'Open Water Technique 2000m',NULL,                                    'completed', 0, 91.0),
  ('ce000020-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001', current_date-11, 'workout', 'f0000030-0000-0000-0000-000000000030', 'Triathlete Strength 45min', NULL,                                    'completed', 1, 100.0),
  ('ce000021-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000001', current_date-10, 'rest',    NULL,                                    'Rest Day',                  NULL,                                    'completed', 0, NULL),
  ('ce000022-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000001', current_date-9,  'workout', 'f0000001-0000-0000-0000-000000000001', 'Sweet Spot 2x20',           NULL,                                    'completed', 0, 96.5),
  ('ce000023-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000001', current_date-8,  'workout', 'f0000013-0000-0000-0000-000000000013', 'Long Run 90min',            NULL,                                    'skipped',   0, NULL),
  ('ce000024-0000-0000-0000-000000000024', 'a0000001-0000-0000-0000-000000000001', current_date-7,  'rest',    NULL,                                    'Rest Day',                  NULL,                                    'completed', 0, NULL),

  -- Week -1 (current week — all done up to yesterday)
  ('ce000025-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000001', current_date-6,  'workout', 'f0000004-0000-0000-0000-000000000004', 'Tempo Ride 60min',          NULL,                                    'completed', 0, 97.0),
  ('ce000026-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000001', current_date-5,  'workout', 'f0000012-0000-0000-0000-000000000012', 'Interval Track 6x800m',    NULL,                                    'completed', 0, 93.0),
  ('ce000027-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000001', current_date-4,  'workout', 'f0000021-0000-0000-0000-000000000021', 'Swim Threshold 10x100m',   NULL,                                    'completed', 0, 88.0),
  ('ce000028-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000001', current_date-3,  'rest',    NULL,                                    'Rest Day',                  NULL,                                    'completed', 0, NULL),
  ('ce000029-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000001', current_date-2,  'workout', 'f0000002-0000-0000-0000-000000000002', 'VO2Max Ramp 5x5',          NULL,                                    'completed', 0, 78.0),
  ('ce000030-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000001', current_date-1,  'workout', 'f0000003-0000-0000-0000-000000000003', 'Endurance Base 3h',        NULL,                                    'completed', 0, 91.0),

  -- TODAY (planned)
  ('ce000031-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000001', current_date,    'workout', 'f0000001-0000-0000-0000-000000000001', 'Sweet Spot 2x20',           'Today''s key session — 250-265W',       'planned',   0, NULL),
  ('ce000032-0000-0000-0000-000000000032', 'a0000001-0000-0000-0000-000000000001', current_date,    'workout', 'f0000030-0000-0000-0000-000000000030', 'Triathlete Strength 45min', NULL,                                    'planned',   1, NULL),

  -- NEXT 2 WEEKS (planned — includes a race!)
  ('ce000033-0000-0000-0000-000000000033', 'a0000001-0000-0000-0000-000000000001', current_date+1,  'rest',    NULL,                                    'Rest Day',                  'Recovery after hard block',             'planned',   0, NULL),
  ('ce000034-0000-0000-0000-000000000034', 'a0000001-0000-0000-0000-000000000001', current_date+2,  'workout', 'f0000013-0000-0000-0000-000000000013', 'Long Run 90min',            NULL,                                    'planned',   0, NULL),
  ('ce000035-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000001', current_date+3,  'workout', 'f0000020-0000-0000-0000-000000000020', 'Open Water Technique 2000m',NULL,                                    'planned',   0, NULL),
  ('ce000036-0000-0000-0000-000000000036', 'a0000001-0000-0000-0000-000000000001', current_date+4,  'workout', 'f0000004-0000-0000-0000-000000000004', 'Tempo Ride 60min',          NULL,                                    'planned',   0, NULL),
  ('ce000037-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000001', current_date+5,  'rest',    NULL,                                    'Rest Day',                  'Pre-race taper',                        'planned',   0, NULL),
  ('ce000038-0000-0000-0000-000000000038', 'a0000001-0000-0000-0000-000000000001', current_date+6,  'race',    NULL,                                    '🏁 Sprint Triathlon — Hồ Tây','A-race: 750m swim / 20km bike / 5km run. Target: sub 1:05:00', 'planned', 0, NULL),
  ('ce000039-0000-0000-0000-000000000039', 'a0000001-0000-0000-0000-000000000001', current_date+7,  'rest',    NULL,                                    'Rest Day',                  'Post-race recovery',                    'planned',   0, NULL),
  ('ce000040-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000001', current_date+8,  'workout', 'f0000010-0000-0000-0000-000000000010', 'Easy Run 45min',            'Shake out post-race',                   'planned',   0, NULL),
  ('ce000041-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000001', current_date+9,  'workout', 'f0000003-0000-0000-0000-000000000003', 'Endurance Base 3h',        'Back to training block',                'planned',   0, NULL),
  ('ce000042-0000-0000-0000-000000000042', 'a0000001-0000-0000-0000-000000000001', current_date+10, 'workout', 'f0000012-0000-0000-0000-000000000012', 'Interval Track 6x800m',    NULL,                                    'planned',   0, NULL),
  ('ce000043-0000-0000-0000-000000000043', 'a0000001-0000-0000-0000-000000000001', current_date+11, 'workout', 'f0000021-0000-0000-0000-000000000021', 'Swim Threshold 10x100m',   NULL,                                    'planned',   0, NULL),
  ('ce000044-0000-0000-0000-000000000044', 'a0000001-0000-0000-0000-000000000001', current_date+12, 'rest',    NULL,                                    'Rest Day',                  NULL,                                    'planned',   0, NULL),
  ('ce000045-0000-0000-0000-000000000045', 'a0000001-0000-0000-0000-000000000001', current_date+13, 'workout', 'f0000002-0000-0000-0000-000000000002', 'VO2Max Ramp 5x5',          'Hard session — rest well beforehand',   'planned',   0, NULL),
  ('ce000046-0000-0000-0000-000000000046', 'a0000001-0000-0000-0000-000000000001', current_date+14, 'workout', 'f0000013-0000-0000-0000-000000000013', 'Long Run 90min',            NULL,                                    'planned',   0, NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ACTIVITIES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO activities (id, user_id, source, source_id, sport, name, started_at, duration_seconds, moving_time_seconds, distance_meters, elevation_gain_meters, calories, avg_heart_rate, max_heart_rate, avg_power, max_power, normalized_power, intensity_factor, tss, avg_cadence, avg_speed, gear_id)
VALUES
  ('ac000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact001', 'cycling', 'Morning Endurance Ride',       (current_date-27)::timestamp+interval'6h', 10920,10640,85200,650,1820,142,168,188,312,196,0.69,115,88,7.8,  'e0000001-0000-0000-0000-000000000001'),
  ('ac000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact002', 'running', 'Easy Morning Run',              (current_date-26)::timestamp+interval'7h', 2700, 2600, 7800, 45, 340,138,155,NULL,NULL,NULL,NULL,42,  5,  3.0, NULL),
  ('ac000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact003', 'swimming','Pool Session 2000m',            (current_date-25)::timestamp+interval'6h30m',3480,3300,2000,0,520,145,162,NULL,NULL,NULL,NULL,55,  52, NULL,NULL),
  ('ac000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact004', 'cycling', 'Sweet Spot 2x20',               (current_date-23)::timestamp+interval'17h',4860,4750,36500,320,890,158,182,258,385,272,0.95,88, 90, 7.7, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'manual', 'manual_ac000005', 'strength','Gym Strength Session', (current_date-23)::timestamp+interval'19h30m',2700,2700,0,0,380,128,158,NULL,NULL,NULL,NULL,35,  0,  NULL,NULL),
  ('ac000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact006', 'running', 'Sunday Long Run',               (current_date-22)::timestamp+interval'6h', 5340,5200,14200,85,920,148,172,NULL,NULL,NULL,NULL,92,  5,  2.66,NULL),
  ('ac000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact007', 'cycling', 'Tempo Ride',                    (current_date-20)::timestamp+interval'17h',3600,3540,27800,210,680,155,176,228,346,238,0.84,64, 88, 7.7, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000008-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact008', 'swimming','Swim Threshold 10x100m',        (current_date-18)::timestamp+interval'6h', 3120,2900,1800,0,480,158,174,NULL,NULL,NULL,NULL,65,  58, NULL,NULL),
  ('ac000009-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact009', 'cycling', 'VO2Max 5x5',                    (current_date-16)::timestamp+interval'17h',4520,4400,34000,280,840,164,188,272,412,289,1.01,98, 92, 7.7, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000010-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact010', 'running', 'Brick Run 13min',               (current_date-16)::timestamp+interval'20h',780, 780, 3200,10,180,155,168,NULL,NULL,NULL,NULL,28,  5,  4.1, NULL),
  ('ac000011-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact011', 'running', 'Long Run 90min',                (current_date-15)::timestamp+interval'6h', 5520,5380,14800,92,960,150,170,NULL,NULL,NULL,NULL,94,  5,  2.68,NULL),
  ('ac000012-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact012', 'cycling', 'Endurance Ride 3h',             (current_date-13)::timestamp+interval'6h', 10740,10500,83000,620,1790,144,170,182,298,191,0.67,111,87,7.8,  'e0000001-0000-0000-0000-000000000001'),
  ('ac000013-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact013', 'running', 'Easy Run',                      (current_date-12)::timestamp+interval'7h', 2680,2600,7500,38,330,136,151,NULL,NULL,NULL,NULL,42,  5,  2.81,NULL),
  ('ac000014-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact014', 'swimming','Pool OW Technique',             (current_date-11)::timestamp+interval'6h', 3600,3420,2100,0,540,143,160,NULL,NULL,NULL,NULL,55,  55, NULL,NULL),
  ('ac000015-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000001', 'manual', 'manual_ac000015', 'strength','Strength & Core',       (current_date-11)::timestamp+interval'18h',2820,2820,0,0,390,132,162,NULL,NULL,NULL,NULL,35,  0,  NULL,NULL),
  ('ac000016-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact016', 'cycling', 'Sweet Spot 2x20 — Felt Strong', (current_date-9)::timestamp+interval'17h', 4820,4720,37200,330,895,160,184,262,388,275,0.97,91, 90, 7.7, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000017-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact017', 'cycling', 'Tempo Session',                 (current_date-6)::timestamp+interval'17h', 3620,3560,28200,215,695,157,178,232,351,241,0.85,65, 89, 7.8, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000018-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact018', 'running', '6x800m Track Session',          (current_date-5)::timestamp+interval'17h', 3680,3440,11200,28,680,162,186,NULL,NULL,NULL,NULL,72,  5,  3.04,NULL),
  ('ac000019-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact019', 'swimming','Swim Threshold',                (current_date-4)::timestamp+interval'6h', 3080,2920,1750,0,462,156,172,NULL,NULL,NULL,NULL,58,  58, NULL,NULL),
  ('ac000020-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact020', 'cycling', 'VO2Max 5x5 — Tough Day',        (current_date-2)::timestamp+interval'17h', 4480,4360,33500,275,820,166,190,268,408,283,0.99,93, 91, 7.7, 'e0000001-0000-0000-0000-000000000001'),
  ('ac000021-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000001', 'garmin', 'gact021', 'cycling', 'Base Endurance Ride',           (current_date-1)::timestamp+interval'6h', 10800,10600,84500,640,1840,143,169,185,305,194,0.68,113,88,7.83,'e0000001-0000-0000-0000-000000000001')
ON CONFLICT (user_id, source, source_id) DO NOTHING;

-- Link activities to calendar events
UPDATE calendar_events SET activity_id='ac000001-0000-0000-0000-000000000001' WHERE id='ce000001-0000-0000-0000-000000000001';
UPDATE calendar_events SET activity_id='ac000002-0000-0000-0000-000000000002' WHERE id='ce000002-0000-0000-0000-000000000002';
UPDATE calendar_events SET activity_id='ac000003-0000-0000-0000-000000000003' WHERE id='ce000003-0000-0000-0000-000000000003';
UPDATE calendar_events SET activity_id='ac000004-0000-0000-0000-000000000004' WHERE id='ce000005-0000-0000-0000-000000000005';
UPDATE calendar_events SET activity_id='ac000005-0000-0000-0000-000000000005' WHERE id='ce000006-0000-0000-0000-000000000006';
UPDATE calendar_events SET activity_id='ac000006-0000-0000-0000-000000000006' WHERE id='ce000007-0000-0000-0000-000000000007';
UPDATE calendar_events SET activity_id='ac000007-0000-0000-0000-000000000007' WHERE id='ce000009-0000-0000-0000-000000000009';
UPDATE calendar_events SET activity_id='ac000008-0000-0000-0000-000000000008' WHERE id='ce000011-0000-0000-0000-000000000011';
UPDATE calendar_events SET activity_id='ac000009-0000-0000-0000-000000000009' WHERE id='ce000013-0000-0000-0000-000000000013';
UPDATE calendar_events SET activity_id='ac000010-0000-0000-0000-000000000010' WHERE id='ce000014-0000-0000-0000-000000000014';
UPDATE calendar_events SET activity_id='ac000011-0000-0000-0000-000000000011' WHERE id='ce000015-0000-0000-0000-000000000015';
UPDATE calendar_events SET activity_id='ac000012-0000-0000-0000-000000000012' WHERE id='ce000017-0000-0000-0000-000000000017';
UPDATE calendar_events SET activity_id='ac000013-0000-0000-0000-000000000013' WHERE id='ce000018-0000-0000-0000-000000000018';
UPDATE calendar_events SET activity_id='ac000014-0000-0000-0000-000000000014' WHERE id='ce000019-0000-0000-0000-000000000019';
UPDATE calendar_events SET activity_id='ac000015-0000-0000-0000-000000000015' WHERE id='ce000020-0000-0000-0000-000000000020';
UPDATE calendar_events SET activity_id='ac000016-0000-0000-0000-000000000016' WHERE id='ce000022-0000-0000-0000-000000000022';
UPDATE calendar_events SET activity_id='ac000017-0000-0000-0000-000000000017' WHERE id='ce000025-0000-0000-0000-000000000025';
UPDATE calendar_events SET activity_id='ac000018-0000-0000-0000-000000000018' WHERE id='ce000026-0000-0000-0000-000000000026';
UPDATE calendar_events SET activity_id='ac000019-0000-0000-0000-000000000019' WHERE id='ce000027-0000-0000-0000-000000000027';
UPDATE calendar_events SET activity_id='ac000020-0000-0000-0000-000000000020' WHERE id='ce000029-0000-0000-0000-000000000029';
UPDATE calendar_events SET activity_id='ac000021-0000-0000-0000-000000000021' WHERE id='ce000030-0000-0000-0000-000000000030';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TRAINING LOAD (60 days CTL/ATL/TSB — realistic triathlete profile)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO training_load (id, user_id, date, sport, daily_tss, ctl, atl, tsb)
SELECT
  gen_random_uuid(),
  'a0000001-0000-0000-0000-000000000001',
  (current_date - s)::date,
  'all',
  CASE WHEN s % 7 = 0 THEN 0 WHEN s % 7 = 1 THEN 95 WHEN s % 7 = 2 THEN 65 WHEN s % 7 = 3 THEN 85 WHEN s % 7 = 4 THEN 0 WHEN s % 7 = 5 THEN 105 ELSE 125 END,
  ROUND((65 + (60 - s)::numeric / 60 * 23)::numeric, 1),
  CASE WHEN s % 7 IN (0,4) THEN 55 ELSE ROUND((75 + ((s % 7)::numeric * 5))::numeric, 1) END,
  0
FROM generate_series(0, 59) AS s
ON CONFLICT (user_id, sport, date) DO NOTHING;

UPDATE training_load SET tsb = ctl - atl
WHERE user_id = 'a0000001-0000-0000-0000-000000000001' AND sport = 'all';

INSERT INTO training_load (id, user_id, date, sport, daily_tss, ctl, atl, tsb)
SELECT
  gen_random_uuid(),
  'a0000001-0000-0000-0000-000000000001',
  (current_date - s)::date,
  'cycling',
  CASE WHEN s % 7 IN (0,4) THEN 0 ELSE CASE WHEN s % 7 IN (5,6) THEN 110 ELSE 70 END END,
  ROUND((48 + (60 - s)::numeric / 60 * 18)::numeric, 1),
  CASE WHEN s % 7 IN (0,4) THEN 40 ELSE ROUND((62 + ((s % 3)::numeric * 6))::numeric, 1) END,
  0
FROM generate_series(0, 59) AS s
ON CONFLICT (user_id, sport, date) DO NOTHING;

UPDATE training_load SET tsb = ctl - atl
WHERE user_id = 'a0000001-0000-0000-0000-000000000001' AND sport = 'cycling';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. WELLNESS LOGS (30 days, realistic variation)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO wellness_logs (id, user_id, date, source, mood, rpe, sleep_quality, sleep_hours, fatigue, soreness, stress_level, resting_hr, hrv, weight_kg, notes)
VALUES
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-29,'garmin',4,6,4,7.5,3,3,4,48,68.2,67.8,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-28,'garmin',4,7,4,7.0,3,3,3,47,71.4,68.0,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-27,'garmin',5,4,5,8.5,2,2,2,45,74.8,68.1,'Great sleep after rest day'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-26,'garmin',4,5,4,7.2,3,3,3,46,70.2,68.2,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-25,'garmin',4,7,3,6.8,4,3,4,49,65.1,68.0,'Legs heavy from yesterday ride'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-24,'garmin',3,4,4,7.5,2,2,3,46,72.3,67.9,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-23,'garmin',5,8,4,7.0,4,3,3,48,66.8,68.1,'Hard double day — felt it'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-22,'garmin',4,6,5,9.0,2,2,2,44,78.9,68.3,'Best sleep in weeks'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-21,'garmin',5,4,5,8.0,2,2,2,43,80.1,68.2,'Rest day felt perfect'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-20,'garmin',4,6,4,7.2,3,2,3,46,69.4,68.0,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-19,'manual',2,3,2,5.5,4,3,5,54,48.2,68.1,'Feeling sick — skipped track session'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-18,'manual',3,5,3,6.5,3,3,4,50,58.1,68.0,'Getting better, swam easy'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-17,'garmin',3,4,4,7.0,3,2,3,48,62.4,67.9,'HRV low — extra rest day added'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-16,'garmin',4,9,3,6.5,5,4,4,50,60.2,68.1,'VO2Max session was brutal'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-15,'garmin',4,7,4,7.5,4,3,3,47,67.8,68.2,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-14,'garmin',5,4,5,8.5,1,1,2,44,79.2,68.4,'Perfect rest day'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-13,'garmin',4,6,4,7.2,3,2,3,46,70.1,68.1,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-12,'garmin',4,5,4,7.5,2,2,3,45,72.4,68.0,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-11,'garmin',5,8,3,6.8,4,4,4,49,64.2,68.2,'Double session — swim + gym'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-10,'garmin',4,5,5,8.0,2,2,2,44,77.1,68.3,'Good recovery rest day'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-9, 'garmin',5,8,4,7.0,4,3,3,48,65.8,68.1,'Best sweet spot session ever'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-8, 'garmin',3,4,4,7.8,2,2,2,45,73.2,68.0,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-7, 'garmin',5,3,5,9.0,1,1,1,42,84.5,68.5,'Full rest — best HRV of month!'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-6, 'garmin',4,7,4,7.0,3,3,3,47,68.4,68.2,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-5, 'garmin',5,8,3,6.5,4,4,4,50,62.1,68.0,'Track hurts but worth it'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-4, 'garmin',4,7,4,7.2,3,3,3,47,67.9,68.1,NULL),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-3, 'garmin',4,5,5,8.2,2,2,2,44,76.3,68.3,'Rest day, feeling fresh'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-2, 'garmin',4,9,3,6.8,5,4,4,51,58.9,68.2,'VO2Max — always hurts'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date-1, 'garmin',4,6,4,7.5,3,2,3,46,70.8,68.0,'Long ride done, fatigue ok'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001',current_date,   'garmin',4,5,4,7.8,2,2,3,45,72.1,68.1,'Ready for sweet spot today')
ON CONFLICT (user_id, date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. HEALTH DAILY SUMMARIES (30 days Garmin data)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO health_daily_summaries (
  id, user_id, date, source,
  steps, distance_meters, calories_total, calories_active, active_minutes,
  resting_hr, avg_stress, body_battery_high, body_battery_low,
  avg_spo2, vo2max, weight_kg, body_fat_pct, bmi
)
SELECT
  gen_random_uuid(),
  'a0000001-0000-0000-0000-000000000001',
  (current_date - s)::date, 'garmin',
  CASE WHEN s%7=0 THEN 7500  ELSE 11000 + (s*80) END,
  CASE WHEN s%7=0 THEN 5200  ELSE 9200  + (s*60) END,
  CASE WHEN s%7=0 THEN 2100  ELSE 2900  + (s*12) END,
  CASE WHEN s%7=0 THEN 420   ELSE 1050  + (s*8)  END,
  CASE WHEN s%7=0 THEN 25    ELSE 65    + (s%3)*10 END,
  45 + (s%4),
  CASE WHEN s%7=0 THEN 22 ELSE 38 + (s%5)*4 END,
  CASE WHEN s%7=0 THEN 88 ELSE 72 + (s%4)*4 END,
  CASE WHEN s%7=0 THEN 48 ELSE 18 + (s%4)*6 END,
  97.5 + (s%3)*0.2,
  58.5 + (s%4)*0.2,
  67.8 + (s%5)*0.08,
  12.5 + (s%3)*0.3,
  22.2
FROM generate_series(0, 29) AS s
ON CONFLICT (user_id, source, date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. HEALTH SLEEP DATA (30 days — correct column names)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO health_sleep_data (
  id, user_id, date, source,
  sleep_start, sleep_end, duration_seconds,
  deep_seconds, light_seconds, rem_seconds, awake_seconds,
  sleep_score, avg_spo2, avg_respiration, avg_hrv
)
SELECT
  gen_random_uuid(),
  'a0000001-0000-0000-0000-000000000001',
  (current_date - s)::date, 'garmin',
  ((current_date - s - 1)::timestamp + interval '22 hours'),
  ((current_date - s)::timestamp   + interval '6 hours'),
  CASE WHEN s%7=0 THEN 29700 ELSE 25200 + (s%3)*1200 END,
  CASE WHEN s%7=0 THEN 6300  ELSE 4200  + (s%3)*600  END,
  CASE WHEN s%7=0 THEN 11700 ELSE 9600  + (s%3)*600  END,
  CASE WHEN s%7=0 THEN 6000  ELSE 4500  + (s%3)*600  END,
  CASE WHEN s%7=0 THEN 600   ELSE 1200  - (s%3)*200  END,
  CASE WHEN s%7=0 THEN 86    ELSE 72    + (s%4)*4    END,
  97.2 + (s%3)*0.1,
  14.2 + (s%3)*0.3,
  68.5 + (s%5)*2.1
FROM generate_series(0, 29) AS s
ON CONFLICT (user_id, source, date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. API KEYS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, is_active, expires_at)
VALUES
  ('ab000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
   'cfk_garm', 'Garmin Integration', true, NULL),
  ('ab000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   'b3a8e0e1f9ab1bfe3a36f231f332964898aec69d99d10d4e38f90e69958d6f08',
   'cfk_home', 'Home Automation Hook', true, now() + interval '355 days')
ON CONFLICT (key_hash) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. OAUTH CONNECTIONS  (Garmin + Strava — correct schema)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO oauth_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, scopes, last_sync_at, sync_status, push_enabled)
VALUES
  ('0c000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'garmin', 'garmin_uid_12345678',
   'DEMO_ENCRYPTED_GARMIN_ACCESS_TOKEN',
   'DEMO_ENCRYPTED_GARMIN_REFRESH_TOKEN',
   now() + interval '1 hour',
   ARRAY['ACTIVITY_EXPORT','HEALTH_EXPORT','TRAINING_PLAN_IMPORT'],
   now() - interval '2 hours', 'active', true),

  ('0c000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'strava', 'strava_uid_87654321',
   'DEMO_ENCRYPTED_STRAVA_ACCESS_TOKEN',
   'DEMO_ENCRYPTED_STRAVA_REFRESH_TOKEN',
   now() + interval '6 hours',
   ARRAY['read','activity:read_all','activity:write'],
   now() - interval '4 hours', 'active', false)
ON CONFLICT (user_id, provider) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. SYNC LOGS  (audit trail — correct schema)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO sync_logs (id, user_id, provider, event_type, status, source_id, error_message, processed_at)
VALUES
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','ACTIVITY_PUSH',   'success','garmin_evt_001',NULL,            now()-interval'2h'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','HEALTH_PUSH',     'success','garmin_evt_002',NULL,            now()-interval'6h'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','ACTIVITY_PUSH',   'success','garmin_evt_003',NULL,            now()-interval'1 day 2h'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','strava','ACTIVITY_PUSH',   'success','strava_evt_001',NULL,            now()-interval'2 days 3h'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','HEALTH_PUSH',     'failed', 'garmin_evt_004','Rate limit exceeded — retry in 60s', now()-interval'3 days'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','HEALTH_SLEEP_PUSH','success','garmin_evt_005',NULL,           now()-interval'8h'),
  (gen_random_uuid(),'a0000001-0000-0000-0000-000000000001','garmin','HEALTH_BODY_PUSH', 'success','garmin_evt_006',NULL,           now()-interval'12h')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. FEATURE FLAGS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO feature_flags (name, description, enabled_tiers, enabled_globally)
VALUES
  ('garmin_training_api',    'Enable push workouts to Garmin Connect',          ARRAY['pro','elite','coach'], true),
  ('analytics_pmc',          'Performance Management Chart (CTL/ATL/TSB)',       ARRAY['pro','elite','coach'], true),
  ('coach_assignments',      'Allow coaches to assign workouts to athletes',      ARRAY['elite','coach'],       true),
  ('ai_workout_suggestions', 'AI-generated workout recommendations (beta)',       ARRAY['elite'],               false),
  ('social_feed',            'Community activity feed',                           ARRAY[]::text[],              false)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SEED COMPLETE
-- =============================================================================
-- Login: minh@demo.coachfit.app / Demo@1234   (athlete, pro tier)
-- Login: coach@demo.coachfit.app / Demo@1234  (coach, elite tier)
-- =============================================================================
