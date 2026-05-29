# Sync Engine Spec — CoachFit

## Tổng Quan

Sync Engine chịu trách nhiệm:
1. Nhận webhook/push từ Strava và Garmin Health API
2. Fetch activity data từ provider API
3. **Nhận health data (HR, sleep, HRV, stress, steps) từ Garmin Health API push**
4. Parse files (FIT/TCX/GPX) upload thủ công
5. Normalize data vào internal model
6. Deduplicate activities
7. Calculate metrics (TSS, NP, IF)
8. Update training load (CTL/ATL/TSB)
9. Auto-fill wellness logs từ health data

## Flow Tổng Thể

```
                    ┌───────────────────────────────────────┐
                    │   Provider Adapters (plugin)      │
                    │                                   │
                    │  Strava │ Garmin │ COROS │ Polar  │
                    └─────────┬────────┬───────┬────────┘
                              │        │       │
                              ▼        ▼       ▼
                    ┌─────────────────────────────┐
                    │   Normalizer (chung)          │
                    │   provider data → internal     │
                    └─────────────┬───────────────┘
                              │
                    ┌───────┴───────────────────┐
                    │   Generic Tables              │
                    │   activities                   │
                    │   health_daily_summaries        │
                    │   health_sleep_data             │
                    │   wellness_logs                 │
                    └────────────────────────────┘
```

**Thiết kế principle:** Thêm provider mới = viết adapter mới, không cần thêm bảng DB. Mọi data đều chảy vào các bảng chung.

---

## Strava Integration

### OAuth Flow
1. User click "Connect Strava"
2. Redirect → `https://www.strava.com/oauth/authorize?client_id=...&scope=activity:read_all&response_type=code&redirect_uri=...`
3. User authorize → redirect back với `code`
4. Backend exchange code → access_token + refresh_token
5. Store encrypted tokens trong `oauth_connections`
6. Register webhook subscription (1 lần duy nhất cho toàn app)

### Webhook Setup (1 lần)
```
POST https://www.strava.com/api/v3/push_subscriptions
{
  "client_id": "...",
  "client_secret": "...",
  "callback_url": "https://api.coachfit.app/api/v1/webhooks/strava",
  "verify_token": "COACHFIT_STRAVA_VERIFY"
}
```

Strava gửi GET verify → respond `hub.challenge`.

### Webhook Processing

**Step 1: Receive (Controller)**
```
POST /api/v1/webhooks/strava
Body: { "object_type": "activity", "aspect_type": "create", "object_id": 12345, "owner_id": 67890 }
```
- Validate subscription
- Nếu `object_type == "activity"` && `aspect_type in (create, update)`:
  - Tìm user theo `owner_id` (= Strava athlete ID trong oauth_connections)
  - Push job to Redis: `{ userId, stravaActivityId, eventType }`
- Return 200 ngay lập tức (< 2 giây)

**Step 2: Worker**
1. Pick job từ Redis queue
2. Load user's Strava tokens từ DB
3. Check token expired → refresh nếu cần
4. `GET https://www.strava.com/api/v3/activities/{id}` (summary)
5. `GET https://www.strava.com/api/v3/activities/{id}/streams?keys=heartrate,watts,cadence,velocity_smooth,altitude,latlng,distance,time` (time-series)
6. Check dedup: `UNIQUE(user_id, 'strava', strava_activity_id)`
7. Nếu duplicate + update event → merge/update existing
8. Nếu new → normalize → calculate → store

### Strava Rate Limits
- 200 requests per 15 minutes
- 2,000 requests per day
- Track trong Redis: `strava_rate:{15min_window}` và `strava_rate:{date}`
- Queue jobs với rate-aware scheduling (delay nếu gần limit)

---

## Garmin Health API Integration

### Tổng Quan
Garmin dùng **push-based** architecture: Garmin đẩy data đến server của mình khi có data mới. **Không cần polling.**

### Đăng ký Partnership
1. Apply tại: https://developer.garmin.com/health-api/overview/
2. Mô tả platform và use case
3. Được approve: nhận consumer_key + consumer_secret
4. Thời gian: 2-6 tuần

### OAuth 1.0a Flow (khác với Strava/Google OAuth 2.0)
1. Request token: `POST /oauth-service/oauth/request_token`
2. Redirect user: `https://connect.garmin.com/oauthConfirm?oauth_token=...`
3. User authorize → callback với `oauth_verifier`
4. Exchange: `POST /oauth-service/oauth/access_token` → access_token + access_token_secret
5. Store trong `oauth_connections` (access_token_secret field, OAuth 1.0a không expire)

### Push Callback URLs (Register 1 lần khi được approve)

| Callback | URL | Dữ liệu nhận |
|---|---|---|
| Dailies | `POST /api/v1/webhooks/garmin/dailies` | Steps, calories, HR, stress |
| Activities | `POST /api/v1/webhooks/garmin/activities` | Activity summary + details |
| Activity Details | `POST /api/v1/webhooks/garmin/activity-details` | Time-series streams |
| Sleep | `POST /api/v1/webhooks/garmin/sleep` | Sleep stages, score, duration |
| Body Composition | `POST /api/v1/webhooks/garmin/body` | Weight, BMI, body fat |
| Stress | `POST /api/v1/webhooks/garmin/stress` | Stress levels throughout day |
| HRV | `POST /api/v1/webhooks/garmin/hrv` | Nightly HRV summary |
| Pulse Ox | `POST /api/v1/webhooks/garmin/pulseox` | SpO2 readings |
| Respiration | `POST /api/v1/webhooks/garmin/respiration` | Breathing rate |
| User Metrics | `POST /api/v1/webhooks/garmin/user-metrics` | VO2max, training status |
| Deregistration | `POST /api/v1/webhooks/garmin/deregistration` | User unlinked Garmin |

### Push Processing (mỗi callback)
```
Garmin cloud → POST callback URL với JSON payload
  → Validate: Garmin IP whitelist + request header verification
  → Find user by garmin_user_access_token (trong payload)
  → Return 200 ngay (< 5 giây)
  → Push job to Redis Stream (async processing)
```

**Garmin push validation:**
- Verify request comes from Garmin IP ranges (documentẻd by Garmin)
- Check `X-Garmin-Signature` header nếu được cung cấp
- Lookup user by `userAccessToken` trong payload body
- Nếu không tìm thấy user → return 200, log warning (không retry)

### Health Data Processing

**Dailies push → health_daily_summaries (source='garmin'):**
1. Nhận JSON payload từ Garmin
2. Extract: steps, calories, resting HR, avg stress, body battery, SpO2
3. Upsert vào `health_daily_summaries` (UNIQUE user_id + source + date)
4. Auto-update `wellness_logs`: resting_hr, stress_level
5. Lưu raw_payload cho reference

**Sleep push → health_sleep_data (source='garmin'):**
1. Nhận sleep data
2. Extract: stages (deep/light/REM/awake), duration, sleep score, HRV nightly
3. Upsert vào `health_sleep_data`
4. Auto-update `wellness_logs`: sleep_hours, sleep_quality, hrv

**Activities push → activities (same pipeline as Strava):**
1. Nhận activity summary + details
2. Parse → normalize → dedup → calculate metrics → store
3. Cross-source dedup với Strava (nếu user connect cả 2)

---

## COROS Integration

### Hiện tại: Không có public API

**Strategy Phase 1: Bridge mode**
- COROS → Strava auto-sync → Strava webhook → CoachFit (activities)
- COROS → FIT file export → user upload → CoachFit
- Health data: **chưa có API** → user nhập tay qua wellness check-in

**Strategy Phase 2+:**
- Apply COROS partnership nếu có traction
- Khi COROS mở API: viết `COROSAdapter` → data đổ vào cùng `health_daily_summaries` + `health_sleep_data` (source='coros')
- **Không cần thêm bảng mới**

---

## ROUVY Integration

### Hiện tại: Không có public API

**Strategy Phase 1: Bridge mode**
- ROUVY → Strava auto-sync → Strava webhook → CoachFit (indoor ride)
- ROUVY → FIT file export → user upload → CoachFit

**Data:** Indoor ride data only (power, HR, cadence, speed, distance). Không có GPS (indoor).

**Nhận dạng ROUVY ride:** Khi activity đến từ Strava, check `external_id` hoặc `device_name` chứa "ROUVY" → tag source = 'rouvy'.

---

## File Upload Processing

### FIT Files (Primary format)
**Library:** Garmin FIT SDK (Java) — `com.garmin.fit`

**Parse flow:**
1. Tạo `FitDecoder` + `MesgBroadcaster`
2. Register listeners cho: `FileIdMesg`, `SessionMesg`, `LapMesg`, `RecordMesg`
3. Decode file
4. Mapping:

| FIT Message | → Internal Model |
|---|---|
| SessionMesg | → activities (summary metrics) |
| LapMesg[] | → activity_laps |
| RecordMesg[] | → activity_streams (aggregate into arrays) |
| FileIdMesg | → source info, device |

**Key fields từ RecordMesg:**
- `timestamp` → timestamps[]
- `heartRate` → heart_rate[]
- `power` → power[]
- `cadence` → cadence[]
- `speed` → speed[] (convert m/s)
- `altitude` → altitude[]
- `positionLat/Long` → lat/lng[] (convert semicircles → degrees: value * 180 / 2^31)

### TCX Files
**Parse:** JAXB hoặc Jackson XML
**Structure:** `TrainingCenterDatabase → Activities → Activity → Lap[] → Track → Trackpoint[]`

| TCX Element | → Internal |
|---|---|
| Activity | → activities |
| Lap | → activity_laps |
| Trackpoint | → activity_streams |
| Extensions (ActivityExtension) | → power, cadence |

### GPX Files
**Parse:** Jackson XML hoặc SAX parser
**Structure:** `gpx → trk → trkseg → trkpt[]`

| GPX Element | → Internal |
|---|---|
| trk | → activities |
| trkpt | → activity_streams |
| extensions (gpxtpx) | → HR, power, cadence |

**Lưu ý:** GPX không có laps → treat toàn bộ là 1 lap duy nhất.

---

## Deduplication Strategy

### Layer 1: Source-based (Primary)
- DB constraint: `UNIQUE(user_id, source, source_id)`
- Same activity từ cùng source → skip hoặc update
- Nhanh, chính xác 100%

### Layer 2: Fingerprint-based (Cross-source)
Khi cùng 1 ride đến từ cả Garmin (file upload) và Strava (webhook):

**Fingerprint:** `hash(started_at ± 60s, sport, duration_seconds ± 60s)`

Logic:
1. Tính fingerprint của activity mới
2. Query existing: `WHERE user_id = ? AND sport = ? AND started_at BETWEEN ? AND ? AND ABS(duration_seconds - ?) < 60`
3. Nếu match:
   - Giữ source chất lượng cao hơn: **FIT file > Garmin API > Strava API**
   - Merge missing fields từ source kia
   - Log conflict trong sync_logs

---

## Metrics Calculation

### Normalized Power (NP)
```
1. Lấy power[] stream (1-second resolution)
2. Rolling average 30 giây
3. Raise mỗi giá trị lên lũy thừa 4
4. Average tất cả giá trị
5. Lấy căn bậc 4
```

### Intensity Factor (IF)
```
IF = NP / FTP
```

### Training Stress Score (TSS)
```
TSS = (duration_seconds × NP × IF) / (FTP × 3600) × 100
```

### HR-based TSS (khi không có power data)
```
hrTSS = TRIMP_modified × scaling_factor
TRIMP = duration_min × ΔHR × weighting
ΔHR = (avgHR - restingHR) / (maxHR - restingHR)
weighting_male = 0.64 × e^(1.92 × ΔHR)
weighting_female = 0.86 × e^(1.67 × ΔHR)
```

### Daily Training Load Update

Khi có activity mới / update / delete:

```
1. Recalculate daily_tss per sport:
   daily_tss_cycling = SUM(tss) WHERE sport='cycling' AND date=?
   daily_tss_running = SUM(tss) WHERE sport='running' AND date=?
   daily_tss_all = SUM(tss) WHERE date=?  (tổng hợp)

2. Mark dirty: 
   UPDATE training_load SET is_dirty = true 
   WHERE user_id = ? AND date >= {changed_date}

3. Queue recalculation job (DEBOUNCED — 5 giây):
   Redis: SETEX recalc:{userId} 5 {fromDate}
   Nếu key đã tồn tại (activity khác đang import), 
   update fromDate = MIN(existing, new)

4. Debounced worker picks up job:
   For each sport (+ 'all'), for each DIRTY day from fromDate → today:
   CTL_today = CTL_yesterday + (daily_tss - CTL_yesterday) / 42
   ATL_today = ATL_yesterday + (daily_tss - ATL_yesterday) / 7
   TSB_today = CTL_yesterday - ATL_yesterday

5. Upsert training_load records, clear is_dirty flag
```

**Optimization:**
- **Debounce 5 giây:** Khi import nhiều activities liên tục, chỉ recalculate 1 lần sau khi import xong
- **Dirty flag:** Chỉ recalculate ngày bị mark dirty
- **Giới hạn mặc định:** Chỉ recalculate 90 ngày gần nhất. Full recalculation khi user yêu cầu hoặc khi FTP thay đổi
- **Batch size:** Tối đa 365 ngày/lần để tránh long-running transaction

> **Note:** Cần thêm column `is_dirty BOOLEAN DEFAULT false` vào bảng `training_load`. Xem [04-database-schema.md](file:///c:/Working/coachfit/docs/04-database-schema.md) để cập nhật schema.

---

## Error Handling

| Lỗi | Xử lý |
|---|---|
| Webhook invalid | Log warning, return 200 (không retry) |
| Token expired + refresh fail | Mark connection 'error', notify user |
| Parse fail (corrupt file) | Return 400 với error message cụ thể |
| Strava API error (5xx) | Retry 3 lần, exponential backoff (1s, 4s, 16s) |
| Strava rate limit (429) | Delay job, retry sau `retry-after` header |
| Garmin push invalid user | Return 200, log warning, không retry |
| Garmin push parse error | Log error, lưu raw_payload, skip |
| Duplicate activity | Skip hoặc merge, log 'skipped' |
| Worker crash | Redis Stream pending list tự retry (XPENDING) |
| Persistent failure | Move to dead-letter stream, log error |

---

## Circuit Breaker (Per Provider)

Mỗi provider có circuit breaker riêng để tránh hammering khi provider down.

**Library:** Resilience4j (Spring Boot integration)

**States:**
```
CLOSED (normal) → OPEN (provider down) → HALF_OPEN (testing) → CLOSED
```

**Trigger rules:**
| Rule | Value |
|---|---|
| Failure threshold | 5 consecutive failures trong 60 giây |
| Open duration | 60 giây (không gọi API) |
| Half-open attempts | 1 request thử nghiệm |
| Monitored exceptions | ConnectException, TimeoutException, 5xx responses |
| Ignored exceptions | 4xx (client errors — không phải provider down) |

**Redis tracking:**
```
Key:   circuit:{provider}  (ví dụ: circuit:strava)
Value: {state: "OPEN", failCount: 5, openedAt: "2025-03-15T06:30:00Z"}
TTL:   300 (auto-reset sau 5 phút nếu không có activity)
```

**Khi circuit OPEN:**
- Sync jobs cho provider đó được **delay** (re-queue với delay = 60s)
- Không gọi provider API
- Log warning: "Circuit breaker OPEN for {provider}, delaying jobs"
- Dashboard hiện sync status: "Provider temporarily unavailable"

**Khi circuit chuyển HALF_OPEN → CLOSED:**
- Process tất cả delayed jobs
- Log info: "Circuit breaker CLOSED for {provider}, resuming sync"

---

## Redis Stream Design (thay BLPOP list)

**Stream name:** `sync:jobs`
**Consumer group:** `sync-workers`
**Job format:**
```json
{
  "type": "strava_activity",
  "userId": "uuid",
  "provider": "strava",
  "sourceId": "12345",
  "eventType": "activity_created",
  "attempt": 0,
  "createdAt": "2025-03-15T06:30:00Z"
}
```

**Producer:** `XADD sync:jobs * type strava_activity userId uuid ...`
**Consumer:** `XREADGROUP GROUP sync-workers worker-1 COUNT 10 BLOCK 5000 STREAMS sync:jobs >`
**Acknowledge:** `XACK sync:jobs sync-workers <messageId>` (sau khi process thành công)
**Pending recovery:** Scheduled job check `XPENDING` mỗi 5 phút, reclaim messages idle > 60s
**Dead letter:** `XADD sync:dead_letter * ...` sau 3 lần fail
**Concurrency:** 1 consumer (MVP), thêm consumer vào group khi scale

**Lý do chọn Redis Streams thay BLPOP:**
- Message không mất khi worker crash (pending list)
- Consumer group: scale nhiều worker dễ dàng
- XACK: đảm bảo at-least-once delivery
- Replay: đọc lại messages từ bất kỳ thời điểm
