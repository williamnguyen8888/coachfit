# Workout Data Model — CoachFit

## Tổng Quan

Workout model cần:
1. Represent mọi loại structured workout (interval, tempo, endurance, etc.)
2. Hỗ trợ multi-sport (cycling, running, swimming)
3. Export được sang .FIT file (push to Garmin/Wahoo)
4. Import từ các format khác (Intervals.icu text, ZWO)
5. Lưu trong JSONB column `workouts.steps` cho flexibility

---

## Universal Workout Schema (JSON)

```json
{
  "sport": "cycling",
  "name": "Tempo Intervals",
  "description": "3x10min tempo with 5min recovery",
  "estimatedDuration": 3600,
  "estimatedTss": 75,
  "steps": [
    {
      "type": "warmup",
      "duration": { "type": "time", "value": 600 },
      "target": { "type": "power_zone", "zone": 2 },
      "cadence": { "min": 85, "max": 95 },
      "notes": "Easy spin"
    },
    {
      "type": "repeat",
      "count": 3,
      "steps": [
        {
          "type": "work",
          "duration": { "type": "time", "value": 600 },
          "target": { "type": "power_pct", "min": 0.88, "max": 0.92 },
          "cadence": { "min": 90, "max": 100 },
          "notes": "Tempo effort"
        },
        {
          "type": "rest",
          "duration": { "type": "time", "value": 300 },
          "target": { "type": "power_zone", "zone": 1 }
        }
      ]
    },
    {
      "type": "cooldown",
      "duration": { "type": "time", "value": 600 },
      "target": { "type": "power_zone", "zone": 1 },
      "notes": "Easy spin to finish"
    }
  ]
}
```

---

## Step Types

| Type | Mô tả | Cho phép nested steps? |
|---|---|---|
| `warmup` | Khởi động | ❌ |
| `work` | Interval/effort chính | ❌ |
| `rest` | Recovery giữa intervals | ❌ |
| `cooldown` | Thả lỏng | ❌ |
| `repeat` | Lặp lại nhóm steps | ✅ (chứa steps[]) |
| `ramp` | Tăng/giảm dần intensity | ❌ |
| `free` | Tự do (tắt ERG mode) | ❌ |

### Repeat Step
```json
{
  "type": "repeat",
  "count": 5,
  "steps": [
    { "type": "work", "duration": {...}, "target": {...} },
    { "type": "rest", "duration": {...}, "target": {...} }
  ]
}
```
Max nesting depth: 1 (repeat không chứa repeat).

---

## Duration Types

| Type | Value | Ví dụ |
|---|---|---|
| `time` | seconds (int) | 600 = 10 phút |
| `distance` | meters (int) | 5000 = 5km |
| `calories` | kcal (int) | 200 |
| `lap_button` | null | User bấm lap để kết thúc |
| `hr_above` | bpm (int) | Kết thúc khi HR > 150 |
| `hr_below` | bpm (int) | Kết thúc khi HR < 120 |

```json
// Ví dụ
{ "type": "time", "value": 600 }
{ "type": "distance", "value": 5000 }
{ "type": "lap_button", "value": null }
```

---

## Target Types

| Type | Fields | Ví dụ | Dùng cho |
|---|---|---|---|
| `power_zone` | zone (1-7) | Zone 3 | Cycling |
| `power_pct` | min, max (% FTP, 0.0-2.0) | 88-92% FTP | Cycling |
| `power_watts` | min, max | 220-240W | Cycling |
| `hr_zone` | zone (1-5) | Zone 4 | All |
| `hr_pct` | min, max (% LTHR) | 90-95% | All |
| `hr_bpm` | min, max | 150-160 bpm | All |
| `pace_zone` | zone (1-5) | Zone 3 | Running |
| `pace` | min, max (sec/km) | 300-330 = 5:00-5:30/km | Running |
| `speed` | min, max (km/h) | 30-35 | Cycling |
| `rpe` | min, max (1-10) | RPE 7-8 | All |
| `open` | null | No target | All |

```json
// Ví dụ
{ "type": "power_zone", "zone": 3 }
{ "type": "power_pct", "min": 0.88, "max": 0.92 }
{ "type": "hr_bpm", "min": 150, "max": 160 }
{ "type": "pace", "min": 300, "max": 330 }
{ "type": "open" }
```

---

## Sport-Specific Considerations

### Cycling
- Primary target: power (zones/watts/%FTP)
- Secondary: cadence
- Duration: time hoặc distance
- ERG mode flag cho indoor trainer

### Running
- Primary target: pace (zones/min per km) hoặc HR
- Secondary: cadence (steps/min)
- Duration: time hoặc distance

### Swimming
- Primary target: pace per 100m hoặc effort level
- Duration: distance (meters) — swimmers think in meters
- Additional fields:

```json
{
  "type": "work",
  "duration": { "type": "distance", "value": 400 },
  "target": { "type": "pace", "min": 95, "max": 100 },
  "swim": {
    "stroke": "freestyle",
    "equipment": ["pull_buoy", "paddles"]
  }
}
```

| Stroke | Values |
|---|---|
| freestyle | Tự do |
| backstroke | Ngửa |
| breaststroke | Ếch |
| butterfly | Bướm |
| mixed | Hỗn hợp |
| drill | Kỹ thuật |

| Equipment | Values |
|---|---|
| pull_buoy | Phao kẹp |
| paddles | Tay chèo |
| fins | Chân vịt |
| kickboard | Ván đạp |
| snorkel | Ống thở |

---

## FIT File Export

### Mapping Internal → FIT

| Internal | FIT Message/Field |
|---|---|
| workout | WorkoutMesg (sport, name, numSteps) |
| step (warmup) | WorkoutStepMesg (WktStepDuration.TIME, intensity: WARMUP) |
| step (work) | WorkoutStepMesg (intensity: ACTIVE) |
| step (rest) | WorkoutStepMesg (intensity: REST) |
| step (cooldown) | WorkoutStepMesg (intensity: COOLDOWN) |
| repeat | WorkoutStepMesg (durationType: REPEAT_UNTIL_STEPS_CMPLT) |
| target power_zone | WktStepTarget.POWER_ZONE |
| target power_pct | WktStepTarget.POWER → convert % to watts |
| target hr_zone | WktStepTarget.HEART_RATE_ZONE |
| target pace | WktStepTarget.SPEED → convert pace to m/s |

### Export Code Flow
```
1. Load workout from DB (JSONB steps)
2. Load user's sport_zones (for zone → absolute value conversion)
3. Create FIT Encoder
4. Add FileIdMesg (type: WORKOUT)
5. Add WorkoutMesg (sport, name, numValidSteps)
6. For each step:
   a. If repeat → add WorkoutStepMesg with REPEAT_UNTIL_STEPS_CMPLT
   b. Else → add WorkoutStepMesg with duration + target + intensity
   c. Convert relative targets (zones, %FTP) to absolute values
7. Encode → binary .FIT file
8. Store to MinIO bucket 'workout-exports'
9. Return download URL (pre-signed, 24h expiry)
```

---

## Import Formats (Phase 2+)

### Intervals.icu Text Format
```
- 10min z2           →  warmup, 600s, power_zone 2
- 3x10min 88-92%     →  repeat 3: work 600s power_pct 88-92%
  5min z1             →  rest 300s power_zone 1
- 10min z1           →  cooldown 600s power_zone 1
```

### ZWO (Zwift Workout) XML
```xml
<workout_file>
  <workout>
    <Warmup Duration="600" PowerLow="0.45" PowerHigh="0.65"/>
    <IntervalsT Repeat="3" OnDuration="600" OnPower="0.9" OffDuration="300" OffPower="0.5"/>
    <Cooldown Duration="600" PowerLow="0.5" PowerHigh="0.35"/>
  </workout>
</workout_file>
```

### ERG/MRC Files
```
[COURSE HEADER]
MINUTES WATTS
[COURSE DATA]
0    100
10   100
10   250
20   250
...
```

---

## Validation Rules

| Rule | Check |
|---|---|
| steps không rỗng | steps.length >= 1 |
| repeat count | 1-99 |
| repeat depth | max 1 (no nested repeats) |
| duration value | > 0 |
| power target | min <= max, 0-2000W hoặc 0-300% FTP |
| HR target | min <= max, 40-250 bpm |
| pace target | min <= max, > 0 sec/km |
| estimated duration | auto-calculate from steps |
