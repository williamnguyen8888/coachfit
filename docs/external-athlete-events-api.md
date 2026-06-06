# External Athlete Events API

Third-party systems and athlete-owned scripts can push planned workouts and notes
into CoachFit calendars using JWT or personal API key auth.

This API is an Intervals.icu-compatible JSON subset for the calendar event
flows CoachFit can safely support today:

- `athlete/0` resolves to the authenticated user.
- `external_id` lets clients retry safely with `upsert=true`.
- `uid` lets clients retry safely with `upsertOnUid=true`.
- `external_source` separates each client application's ownership boundary.
- Range delete only touches events created by the same `external_source`.

Compatibility notes:

| Intervals.icu feature | CoachFit support |
|---|---|
| `athlete/0` | Supported |
| JSON create/update/list/delete/bulk-delete | Supported |
| `upsert=true` by `external_id` | Supported |
| `upsertOnUid=true` by `uid` | Supported |
| Native structured `description` workout text | Supported for the grammar below |
| `file_contents`, `file_contents_base64`, `.zwo/.mrc/.erg/.fit` parsing | Payload accepted, parsing not implemented |
| `/events.csv`, workout download, `mark-done`, `apply-plan` | Not implemented |
| Intervals numeric event ids | Not used; CoachFit event ids are UUIDs |

Base URL: `/api/v1`

Auth:

```http
Authorization: Bearer <JWT_OR_CF_LIVE_API_KEY>
```

## Source Identity

Clients can identify themselves in either place:

```http
X-CoachFit-Source: trainingpeaks
```

or:

```http
?source=trainingpeaks
```

If omitted, `external_source` is `api`.

Use a stable lowercase source key per integration. Source values are normalized
to lowercase and non `[a-z0-9_.-]` characters become `_`.

## Event Fields

Request body fields accepted by create, bulk create, and update:

| Field | Type | Notes |
|---|---:|---|
| `category` | string | `WORKOUT`, `NOTE`, `RACE_A`, `RACE_B`, `RACE_C`, `REST`, `HOLIDAY`, `SICK`, `INJURED`; unknown values become notes |
| `start_date_local` | string | Local ISO date or date-time; only the first `YYYY-MM-DD` is used |
| `date` | date | Alternative to `start_date_local` |
| `name` | string | Required on create; max 255 chars |
| `description` | string | Structured workout text is parsed when no `steps`/`workout_doc` is provided |
| `type` | string | Sport hint such as `Ride`, `Run`, `Swim`, `Workout`; normalized internally |
| `moving_time` | integer | Planned duration seconds |
| `time_target` | integer | Alternative planned duration seconds |
| `icu_training_load` | number | Planned training load/TSS |
| `load_target` | number | Alternative planned training load |
| `tags` | string[] | Stored on imported workout definitions |
| `workout_id` | UUID | Optional existing CoachFit workout to schedule |
| `uid` | string | Intervals-style event UID for `upsertOnUid=true`; max 255 chars |
| `external_id` | string | Client-side primary key for upsert/delete; max 255 chars |
| `steps` | JSON array | CoachFit workout steps; highest precedence |
| `workout.steps` | JSON array | Alternative nested steps |
| `workout_doc` | JSON array/object | Alternative nested steps source |
| `filename`, `file_contents`, `file_contents_base64` | string | Accepted in payload for compatibility; file parsing is not implemented yet |

Workout creation precedence for `category=WORKOUT`:

1. Use `workout_id` if provided and accessible.
2. Use explicit `steps`, `workout.steps`, or `workout_doc`.
3. Parse structured `description`.
4. Fallback to one open workout block using `moving_time`, `time_target`, or 3600s.

## Description Grammar

The parser is deterministic and only accepts structured workout text. If any
non-empty line does not match the grammar, parsing is skipped and the API falls
back to an open workout block.

Supported line forms:

```text
<duration> <target-or-keyword>
<repeat>x<duration> <target-or-keyword> / <duration> <rest-target>
<repeat>x<duration> <target-or-keyword>, <duration> rest
<repeat>x<duration> <target-or-keyword>
  <duration> recovery <target>
```

Duration units:

| Input | Meaning |
|---|---|
| `30s`, `30sec` | 30 seconds |
| `10min`, `10m` | 10 minutes, except bare `m` can mean meters for large distance intervals |
| `2h`, `2hr` | 2 hours |
| `1km` | 1000 meters |
| `400m` | 400 meters for run-style distance intervals |
| `50m` with `type=Swim` | 50 meters |

Target forms:

| Input | CoachFit target |
|---|---|
| `z2`, `zone 2` | Cycling `power_zone`; run/swim `pace_zone`; other sports `hr_zone` |
| `88-92%` | Cycling `power_pct`; other sports `hr_pct` |
| `230-250w` | `power_watts` |
| `150-160bpm` | `hr_bpm` |
| `4:30/km`, `4:30-4:50/km` | `pace` in seconds per km |
| `rpe 6-7` | `rpe` |
| `easy`, `endurance` | zone 2 |
| `tempo` | zone 3 |
| `threshold`, `sweetspot` | zone 4 |
| `vo2`, `vo2max` | zone 5 |
| `rest`, `recovery` | zone 1 |

Examples:

```text
10min warmup z2
3x10min 88-92% / 5min z1
10min cooldown z1
```

```text
5x1km @ 4:30/km, 2min rest
```

```text
8x50m easy / 20s rest
```

## List Events

```http
GET /api/v1/athlete/0/events?oldest=2026-06-01&newest=2026-06-07&category=WORKOUT
```

Query params:

| Param | Required | Notes |
|---|---:|---|
| `oldest` | no | Defaults to today |
| `newest` | no | Defaults to `oldest + 6 days` |
| `category` | no | Comma-separated or repeated; e.g. `WORKOUT,NOTE` |
| `limit` | no | Clamped to 1-1000 |

Response `200`:

```json
[
  {
    "id": "10000000-0000-0000-0000-000000000001",
    "athlete_id": "00000000-0000-0000-0000-000000000001",
    "start_date_local": "2026-06-10T00:00:00",
    "end_date_local": "2026-06-11T00:00:00",
    "category": "WORKOUT",
    "name": "Tempo Ride",
    "description": "3x10min tempo",
    "type": "cycling",
    "moving_time": 3600,
    "icu_training_load": 80,
    "workout_id": "20000000-0000-0000-0000-000000000001",
    "uid": "calendar-uid-123",
    "external_id": "tp-workout-123",
    "external_source": "trainingpeaks",
    "status": "planned"
  }
]
```

## Create Or Upsert One Event

```http
POST /api/v1/athlete/0/events?upsert=true&source=trainingpeaks
Content-Type: application/json
```

```json
{
  "category": "WORKOUT",
  "start_date_local": "2026-06-10T00:00:00",
  "name": "Threshold Set",
  "description": "10min warmup z2\n3x10min 88-92% / 5min z1\n10min cooldown z1",
  "type": "Ride",
  "external_id": "tp-workout-123"
}
```

Response `200`: event object.

With `upsert=true`, `external_id` is matched only within the same
`athlete_id + external_source`. If no match exists, a new event is created.

Intervals-style UID upsert is also supported:

```http
POST /api/v1/athlete/0/events?upsertOnUid=true
Content-Type: application/json
```

```json
{
  "category": "WORKOUT",
  "start_date_local": "2026-06-10",
  "name": "Threshold Set",
  "uid": "calendar-uid-123",
  "description": "3x10min threshold / 5min z1",
  "type": "Ride"
}
```

With `upsertOnUid=true`, `uid` is required and is matched within the
authenticated athlete's calendar.

## Bulk Create Or Upsert

```http
POST /api/v1/athlete/0/events/bulk?upsert=true
Content-Type: application/json
X-CoachFit-Source: trainingpeaks
```

```json
[
  {
    "category": "WORKOUT",
    "start_date_local": "2026-06-10",
    "name": "Tempo Ride",
    "description": "3x10min tempo / 5min z1",
    "type": "Ride",
    "external_id": "tp-1"
  },
  {
    "category": "NOTE",
    "start_date_local": "2026-06-11",
    "name": "Travel day",
    "description": "Keep volume flexible.",
    "external_id": "tp-2"
  }
]
```

Response `200`: array of event objects.

Limit: 500 events per request.

Bulk `upsert=true` matches by `external_id`. If `upsert=true` and
`upsertOnUid=true` are both supplied, `upsert=true` wins, matching Intervals'
bulk behavior. `updatePlanApplied` is accepted as a query param for request
compatibility but is not used by CoachFit yet.

## Update One Event

```http
PUT /api/v1/athlete/0/events/{eventId}
Content-Type: application/json
```

The body uses the same fields as create. The event must belong to the
authenticated athlete.

Response `200`: updated event object.

## Delete One Event

```http
DELETE /api/v1/athlete/0/events/{eventId}
```

Response `200`:

```json
{ "eventsDeleted": 1 }
```

## Bulk Delete

```http
PUT /api/v1/athlete/0/events/bulk-delete?source=trainingpeaks
Content-Type: application/json
```

```json
[
  { "external_id": "tp-1" },
  { "id": "10000000-0000-0000-0000-000000000001" }
]
```

Rules:

- If `external_id` is supplied, it is matched inside the same `external_source`.
- If both `id` and `external_id` are supplied, `external_id` wins.
- `id` must be a CoachFit UUID, not an Intervals numeric id.
- Missing events are ignored.

Response `200`:

```json
{ "eventsDeleted": 2 }
```

## Delete Range

```http
DELETE /api/v1/athlete/0/events?oldest=2026-06-01&newest=2026-06-30&category=WORKOUT&source=trainingpeaks
```

Required query params:

| Param | Notes |
|---|---|
| `oldest` | Inclusive local date |
| `category` | Comma-separated or repeated; e.g. `WORKOUT,NOTE` |

Optional query params:

| Param | Notes |
|---|---|
| `newest` | Inclusive local date; defaults to all future dates |
| `source` | Defaults to `api` unless `X-CoachFit-Source` is supplied |

Safety rule: range delete only deletes rows with matching `external_source`.
It does not delete calendar entries manually created by the user or coach.

Response `200`:

```json
{ "eventsDeleted": 12 }
```

## Error Behavior

| Status | Example |
|---:|---|
| `400` | Invalid date, malformed UUID, missing body, invalid date range |
| `401` | Missing or invalid bearer token/API key |
| `404` | Athlete id is not `0`/`me`/authenticated user's UUID, or event/workout not found |

## Curl Examples

```bash
curl -X POST 'https://api.coachfit.app/api/v1/athlete/0/events?upsert=true&source=trainingpeaks' \
  -H 'Authorization: Bearer cf_live_xxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "category": "WORKOUT",
    "start_date_local": "2026-06-10",
    "name": "Threshold Set",
    "description": "10min warmup z2\n3x10min 88-92% / 5min z1\n10min cooldown z1",
    "type": "Ride",
    "external_id": "tp-workout-123"
  }'
```

```bash
curl -X DELETE 'https://api.coachfit.app/api/v1/athlete/0/events?oldest=2026-06-01&newest=2026-06-30&category=WORKOUT&source=trainingpeaks' \
  -H 'Authorization: Bearer cf_live_xxx'
```
