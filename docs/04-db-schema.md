# Database Schema — CoachFit

## Conventions

- **PostgreSQL 16**
- UUID cho primary keys
- `snake_case` cho tên bảng và cột
- Timestamps: `created_at`, `updated_at` (UTC, auto-set)
- Soft delete: `deleted_at` (nullable)
- JSONB cho flexible/extensible fields
- Migration tool: **Flyway** — format `V001__create_users.sql`
- **Providers (canonical list):**
  - Auth only: `google`
  - Sync (activities + health): `strava`, `garmin`, `coros`, `wahoo`, `polar`, `rouvy`
  - Health only (khi có API): `garmin`, `coros`, `polar`
  - Non-OAuth sources: `file_upload`, `manual`, `apple_health`
  - Dùng VARCHAR(20) — KHÔNG dùng ENUM (để thêm provider mới không cần migration)

---

## Core Tables

### users

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| email | VARCHAR(255) UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) | nullable (OAuth users) |
| full_name | VARCHAR(255) NOT NULL | |
| avatar_url | VARCHAR(512) | nullable |
| role | VARCHAR(20) DEFAULT 'athlete' | athlete / coach / admin |
| onboarding_completed | BOOLEAN DEFAULT false | |
| settings | JSONB DEFAULT '{}' | {locale, units, timezone} |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | nullable |

### subscriptions

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users UNIQUE | 1 subscription per user |
| tier | VARCHAR(20) DEFAULT 'free' | free / pro / elite / coach |
| status | VARCHAR(20) DEFAULT 'active' | active / cancelled / expired / trial |
| stripe_customer_id | VARCHAR(255) | nullable |
| stripe_subscription_id | VARCHAR(255) | nullable |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### feature_flags

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE NOT NULL | 'advanced_analytics', 'ai_insights' |
| description | TEXT | |
| enabled_tiers | TEXT[] | {'pro','elite','coach'} |
| enabled_globally | BOOLEAN DEFAULT false | for rollout |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### oauth_connections

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| provider | VARCHAR(20) NOT NULL | strava / garmin / coros / wahoo / polar / google |
| provider_user_id | VARCHAR(255) NOT NULL | |
| access_token | TEXT NOT NULL | **AES-256 encrypted** |
| refresh_token | TEXT | encrypted |
| access_token_secret | TEXT | encrypted, **Garmin OAuth 1.0a only** |
| token_expires_at | TIMESTAMPTZ | nullable (OAuth 1.0a tokens don't expire) |
| scopes | TEXT[] | |
| last_sync_at | TIMESTAMPTZ | nullable |
| sync_status | VARCHAR(20) DEFAULT 'active' | active / error / disconnected |
| push_enabled | BOOLEAN DEFAULT false | Garmin push callbacks registered? |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| **UNIQUE(user_id, provider)** | | |

**Indexes:**
- `UNIQUE(user_id, provider)`
- `INDEX(provider, provider_user_id)` — webhook user lookup

### athlete_profiles

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users UNIQUE | |
| date_of_birth | DATE | nullable |
| gender | VARCHAR(10) | nullable: male / female / other |
| weight_kg | DECIMAL(5,2) | nullable |
| height_cm | DECIMAL(5,1) | nullable |
| sports | TEXT[] NOT NULL | {'cycling','running','swimming'} |
| experience_level | VARCHAR(20) | beginner / intermediate / advanced / expert |
| primary_sport | VARCHAR(50) | |
| primary_health_source | VARCHAR(20) | garmin / coros / polar — nguồn health data ưu tiên hiển trên dashboard |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### sport_zones

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| sport | VARCHAR(50) NOT NULL | cycling / running / swimming |
| zone_type | VARCHAR(20) NOT NULL | power / heart_rate / pace |
| ftp | INTEGER | nullable — cycling: watts, running: sec/km (ví dụ 285 = 4:45/km) |
| lthr | INTEGER | nullable — bpm |
| max_hr | INTEGER | nullable — bpm |
| zones | JSONB NOT NULL | [{zone:1, name:"Recovery", min:0, max:55}, ...] |
| effective_date | DATE NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| **UNIQUE(user_id, sport, zone_type, effective_date)** | | |

---

## Activity Tables

### activities

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users NOT NULL | |
| source | VARCHAR(20) NOT NULL | strava / garmin / coros / wahoo / file_upload / manual |
| source_id | VARCHAR(255) | ID từ nguồn gốc, dùng cho dedup |
| sport | VARCHAR(50) NOT NULL | cycling / running / swimming / strength / other |
| sub_sport | VARCHAR(50) | indoor_cycling / trail_running / open_water |
| name | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| started_at | TIMESTAMPTZ NOT NULL | |
| duration_seconds | INTEGER NOT NULL | elapsed |
| moving_time_seconds | INTEGER | |
| distance_meters | DECIMAL(12,2) | |
| elevation_gain_meters | DECIMAL(8,2) | |
| calories | INTEGER | |
| avg_heart_rate | INTEGER | |
| max_heart_rate | INTEGER | |
| avg_power | INTEGER | watts |
| max_power | INTEGER | |
| normalized_power | INTEGER | |
| intensity_factor | DECIMAL(4,3) | |
| tss | DECIMAL(8,2) | Training Stress Score |
| avg_cadence | INTEGER | |
| avg_pace | DECIMAL(8,2) | sec/km |
| avg_speed | DECIMAL(8,2) | km/h |
| start_lat | DECIMAL(10,7) | |
| start_lng | DECIMAL(10,7) | |
| gear_id | UUID FK → gear | nullable |
| weather | JSONB | {temp_c, humidity, wind_kph, condition} |
| raw_file_path | VARCHAR(512) | MinIO path |
| raw_file_format | VARCHAR(10) | fit / tcx / gpx |
| extra | JSONB DEFAULT '{}' | extensible |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | nullable — soft delete |

**Indexes:**
- `UNIQUE(user_id, source, source_id)` — dedup
- `INDEX(user_id, started_at DESC)` — activity list
- `INDEX(user_id, sport)` — filter by sport

### activity_streams

Time-series data. Lưu dạng array cho hiệu quả (1 row per activity thay vì 1 row per second).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| activity_id | UUID FK → activities **UNIQUE** | |
| timestamps | INTEGER[] | seconds from start |
| heart_rate | SMALLINT[] | bpm |
| power | SMALLINT[] | watts |
| cadence | SMALLINT[] | rpm |
| speed | REAL[] | m/s |
| altitude | REAL[] | meters |
| latitude | DOUBLE PRECISION[] | |
| longitude | DOUBLE PRECISION[] | |
| distance | REAL[] | cumulative meters |
| temperature | SMALLINT[] | celsius |
| grade | REAL[] | % |

### activity_laps

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| activity_id | UUID FK → activities | |
| lap_index | SMALLINT NOT NULL | 0-based |
| start_time | TIMESTAMPTZ | |
| duration_seconds | INTEGER | |
| distance_meters | DECIMAL(10,2) | |
| avg_heart_rate | INTEGER | |
| max_heart_rate | INTEGER | |
| avg_power | INTEGER | |
| max_power | INTEGER | |
| avg_cadence | INTEGER | |
| avg_pace | DECIMAL(8,2) | |
| elevation_gain | DECIMAL(8,2) | |

**Index:** `INDEX(activity_id)`

---

## Training & Wellness Tables

### training_load

Daily aggregated values cho PMC chart. **Per sport** + tổng hợp.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE NOT NULL | |
| sport | VARCHAR(50) NOT NULL | 'all' (tổng hợp) hoặc 'cycling' / 'running' / 'swimming' |
| daily_tss | DECIMAL(8,2) | tổng TSS trong ngày cho sport này |
| ctl | DECIMAL(8,2) | Chronic Training Load (fitness) |
| atl | DECIMAL(8,2) | Acute Training Load (fatigue) |
| tsb | DECIMAL(8,2) | Training Stress Balance (form) |
| **UNIQUE(user_id, sport, date)** | | |

**Index:** `INDEX(user_id, sport, date DESC)`

### wellness_logs

Kết hợp dữ liệu từ Garmin Health API (auto) + user nhập tay (manual).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE NOT NULL | |
| source | VARCHAR(20) DEFAULT 'manual' | manual / garmin / coros / polar |
| mood | SMALLINT | 1-5 (manual input) |
| rpe | SMALLINT | 1-10 Rate of Perceived Exertion (manual) |
| sleep_quality | SMALLINT | 1-5 (manual hoặc auto từ Garmin) |
| sleep_hours | DECIMAL(3,1) | |
| fatigue | SMALLINT | 1-5 (manual) |
| soreness | SMALLINT | 1-5 (manual) |
| stress_level | SMALLINT | 1-5 (manual) hoặc auto từ provider |
| resting_hr | INTEGER | bpm — auto từ wearable |
| hrv | DECIMAL(6,2) | rMSSD — auto từ wearable |
| weight_kg | DECIMAL(5,2) | auto từ smart scale hoặc manual |
| notes | TEXT | |
| field_sources | JSONB DEFAULT '{}' | tracks which source provided each field, e.g. {"mood": "manual", "resting_hr": "garmin"} |
| **UNIQUE(user_id, date)** | | upserts should merge fields and update field_sources accordingly |

### health_daily_summaries

Dữ liệu sức khỏe hàng ngày — **provider-agnostic**. Bất kỳ nguồn nào (Garmin, COROS, Polar, Apple Health...) đều đổ vào bảng này.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE NOT NULL | |
| source | VARCHAR(20) NOT NULL | garmin / coros / polar / wahoo / apple_health / manual |
| steps | INTEGER | |
| distance_meters | DECIMAL(10,2) | |
| calories_total | INTEGER | |
| calories_active | INTEGER | |
| active_minutes | INTEGER | |
| intensity_minutes | INTEGER | nullable — Garmin-specific |
| floors_climbed | INTEGER | nullable |
| resting_hr | INTEGER | bpm |
| avg_hr | INTEGER | |
| max_hr | INTEGER | |
| avg_stress | INTEGER | 0-100, nullable |
| max_stress | INTEGER | nullable |
| body_battery_high | INTEGER | 0-100, nullable (Garmin/COROS) |
| body_battery_low | INTEGER | nullable |
| avg_spo2 | DECIMAL(4,1) | %, nullable |
| avg_respiration | DECIMAL(4,1) | breaths/min, nullable |
| vo2max | DECIMAL(4,1) | ml/kg/min, nullable |
| extra | JSONB DEFAULT '{}' | Provider-specific data không fit columns trên |
| raw_payload | JSONB | Full raw data từ provider — backup/debug |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| **UNIQUE(user_id, source, date)** | | Cho phép nhiều source cùng ngày |

**Index:** `INDEX(user_id, date DESC)`

### health_sleep_data

Dữ liệu giấc ngủ — **provider-agnostic**.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE NOT NULL | ngày thức dậy |
| source | VARCHAR(20) NOT NULL | garmin / coros / polar / apple_health |
| sleep_start | TIMESTAMPTZ | |
| sleep_end | TIMESTAMPTZ | |
| duration_seconds | INTEGER | tổng thời gian ngủ |
| deep_seconds | INTEGER | deep sleep |
| light_seconds | INTEGER | light sleep |
| rem_seconds | INTEGER | REM sleep |
| awake_seconds | INTEGER | thời gian tỉnh giấc |
| sleep_score | INTEGER | 0-100 (nếu provider cung cấp) |
| avg_respiration | DECIMAL(4,1) | nhịp thở khi ngủ, nullable |
| avg_spo2 | DECIMAL(4,1) | SpO2 khi ngủ, nullable |
| avg_hrv | DECIMAL(6,2) | HRV nightly average (rMSSD), nullable |
| hrv_status | VARCHAR(20) | balanced / low / unbalanced, nullable |
| extra | JSONB DEFAULT '{}' | Provider-specific data |
| raw_payload | JSONB | Full raw data từ provider |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| **UNIQUE(user_id, source, date)** | | |

**Index:** `INDEX(user_id, date DESC)`

> **Thiết kế principle:** Mỗi bảng health có `source` + `extra` (JSONB) + `raw_payload` (JSONB). Columns chung (steps, HR, sleep stages...) là columns thật. Data đặc thù của provider vào `extra`. Thêm provider mới = thêm adapter, không cần thêm bảng.

---

## Workout & Calendar Tables

### workouts

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | nullable (system templates = null) |
| name | VARCHAR(255) NOT NULL | |
| sport | VARCHAR(50) NOT NULL | |
| description | TEXT | |
| estimated_duration_seconds | INTEGER | |
| estimated_tss | DECIMAL(6,2) | |
| steps | JSONB NOT NULL | workout structure — xem `07-workout-data-model.md` |
| tags | TEXT[] | {'tempo','threshold','endurance'} |
| is_template | BOOLEAN DEFAULT false | |
| is_public | BOOLEAN DEFAULT false | |
| source | VARCHAR(20) DEFAULT 'user' | user / system / coach / import |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | nullable — soft delete |

**Index:** `INDEX(user_id)`

### calendar_events

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE NOT NULL | |
| event_type | VARCHAR(20) NOT NULL | workout / note / race / rest |
| workout_id | UUID FK → workouts | nullable |
| activity_id | UUID FK → activities | nullable (linked when completed) |
| title | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| status | VARCHAR(20) DEFAULT 'planned' | planned / completed / skipped / partial |
| order_index | SMALLINT DEFAULT 0 | multiple events same day |
| compliance_score | DECIMAL(5,2) | 0-100%, nullable — auto-calculated khi link activity |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | nullable — soft delete |

**Index:** `INDEX(user_id, date)`

> **compliance_score** tính tự động khi activity được link vào calendar_event:
> - So sánh planned workout vs actual activity
> - Duration compliance: actual/planned (±10% = 100%, càng xa càng thấp)
> - Intensity compliance: avg power/HR vs target zones
> - Weighted average: 60% duration + 40% intensity

---

## Support Tables

### api_keys

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| key_hash | VARCHAR(255) NOT NULL | SHA-256 hash |
| key_prefix | VARCHAR(10) NOT NULL | first 8 chars: "cf_live_x" |
| name | VARCHAR(100) | user-given name |
| last_used_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | nullable |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### sync_logs

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| provider | VARCHAR(20) NOT NULL | |
| event_type | VARCHAR(50) | activity_created / activity_updated / activity_deleted / file_upload / health_daily_push / health_sleep_push / health_body_push / health_hrv_push / provider_deregistration |
| status | VARCHAR(20) | pending / processing / success / failed / skipped |
| source_id | VARCHAR(255) | provider's activity ID |
| activity_id | UUID FK → activities | nullable |
| error_message | TEXT | |
| payload | JSONB | raw webhook payload |
| processed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

**Index:** `INDEX(user_id, created_at DESC)`

### gear

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR(255) NOT NULL | 'Giant TCR', 'Nike Vaporfly' |
| sport | VARCHAR(50) | |
| type | VARCHAR(50) | bike / shoes / wetsuit |
| is_active | BOOLEAN DEFAULT true | |
| total_distance_meters | DECIMAL(12,2) DEFAULT 0 | calculated from activities |
| created_at | TIMESTAMPTZ DEFAULT now() | |

> **total_distance_meters** được recalculate khi: activity created/updated/deleted, gear_id changed. Query: `SELECT COALESCE(SUM(distance_meters), 0) FROM activities WHERE gear_id = ? AND deleted_at IS NULL`.

### coach_athletes

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| coach_user_id | UUID FK → users NOT NULL | |
| athlete_user_id | UUID FK → users NOT NULL | |
| status | VARCHAR(20) NOT NULL DEFAULT 'pending' | pending / active / revoked / expired |
| invite_type | VARCHAR(20) | email / link / manual |
| invite_token | VARCHAR(255) | encrypted, nullable |
| invite_code | VARCHAR(50) | for shareable links, nullable |
| permissions | JSONB NOT NULL DEFAULT '{"readActivities":true,"readActivityStreams":true,"readWellness":true,"readHealthData":true,"readTrainingLoad":true,"writeCalendar":true,"writeWorkouts":true,"writeComments":true,"viewProfile":true,"viewZones":true}' | granular permissions |
| nickname | VARCHAR(100) | coach's custom name for athlete |
| notes | TEXT | coach's private notes |
| tags | TEXT[] | coach's tags: {'beginner','ironman'} |
| invited_at | TIMESTAMPTZ DEFAULT now() | |
| accepted_at | TIMESTAMPTZ | nullable |
| revoked_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| **UNIQUE(coach_user_id, athlete_user_id)** | | |

**Indexes:** `INDEX(coach_user_id, status)`, `INDEX(athlete_user_id)`

### coach_invite_links

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| coach_user_id | UUID FK → users NOT NULL | |
| code | VARCHAR(50) UNIQUE NOT NULL | random 12-char code |
| is_reusable | BOOLEAN DEFAULT false | |
| is_active | BOOLEAN DEFAULT true | |
| max_uses | INTEGER | nullable, null = unlimited |
| used_count | INTEGER DEFAULT 0 | |
| expires_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### activity_comments

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| activity_id | UUID FK → activities NOT NULL | |
| user_id | UUID FK → users NOT NULL | comment author (athlete or coach) |
| parent_id | UUID FK → activity_comments | nullable, for threaded replies |
| content | TEXT NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | soft delete |

**Index:** `INDEX(activity_id, created_at)`

### notifications

Thông báo cho athlete và coach.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users NOT NULL | người nhận |
| type | VARCHAR(50) NOT NULL | coach_invite / workout_assigned / workout_completed / comment_added / alert_overtraining / alert_missed_workout |
| title | VARCHAR(255) NOT NULL | |
| body | TEXT | |
| data | JSONB | {activityId, athleteId, workoutId, ...} — context data |
| is_read | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

**Index:** `INDEX(user_id, is_read, created_at DESC)`

### audit_log

Tracking sensitive changes for debugging and compliance.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users NOT NULL | người thực hiện action |
| action | VARCHAR(50) NOT NULL | zone_updated / tier_changed / permission_changed / coach_revoked / account_deleted |
| entity_type | VARCHAR(50) | user / subscription / coach_athletes / sport_zones |
| entity_id | UUID | nullable |
| old_value | JSONB | |
| new_value | JSONB | |
| ip_address | VARCHAR(45) | nullable |
| created_at | TIMESTAMPTZ DEFAULT now() | |

**Index:** `INDEX(user_id, created_at DESC)`

---

## Entity Relationship (Tóm tắt)

```
users 1──1 athlete_profiles
users 1──1 subscriptions
users 1──N oauth_connections
users 1──N sport_zones
users 1──N activities
users 1──N workouts
users 1──N calendar_events
users 1──N wellness_logs
users 1──N health_daily_summaries
users 1──N health_sleep_data
users 1──N training_load
users 1──N api_keys
users 1──N sync_logs
users 1──N gear
users 1──N coach_athletes (as coach)
users 1──N coach_athletes (as athlete)
users 1──N coach_invite_links
users 1──N activity_comments
users 1──N notifications
users 1──N audit_log

activities 1──1 activity_streams
activities 1──N activity_laps
activities N──1 gear
activities 1──N activity_comments

calendar_events N──1 workouts
calendar_events N──1 activities
```

## Migration Order

```
V001__create_users.sql
V002__create_subscriptions.sql
V003__create_feature_flags.sql
V004__create_oauth_connections.sql
V005__create_athlete_profiles.sql
V006__create_sport_zones.sql
V007__create_activities.sql
V008__create_activity_streams.sql
V009__create_activity_laps.sql
V010__create_training_load.sql
V011__create_wellness_logs.sql
V012__create_health_daily_summaries.sql
V013__create_health_sleep_data.sql
V014__create_workouts.sql
V015__create_calendar_events.sql
V016__create_api_keys.sql
V017__create_sync_logs.sql
V018__create_gear.sql
V019__seed_feature_flags.sql
V020__seed_workout_templates.sql
V021__create_coach_athletes.sql
V022__create_coach_invite_links.sql
V023__create_activity_comments.sql
V024__create_notifications.sql
V025__create_audit_log.sql
V026__add_wellness_field_sources.sql
V027__add_oauth_connection_indexes.sql
```
