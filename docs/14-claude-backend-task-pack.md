# Claude Backend Task Pack — CoachFit

Tài liệu này là pack prompt chỉ dành cho backend. Mỗi prompt là một ticket nhỏ để bạn giao cho AI như giao việc cho một backend engineer.

## Mục tiêu

- Build backend theo đúng docs
- Đi từng bước nhỏ để dễ kiểm soát
- Giữ backend đúng `Spring Modulith + Hexagonal`
- Không gộp quá nhiều việc vào một prompt

## Luật dùng pack này

- Chỉ giao `1 prompt` mỗi lần
- Chỉ sang prompt tiếp theo khi prompt trước đã đạt
- Nếu prompt nào fail, yêu cầu AI sửa ngay prompt đó
- Không gộp 2-3 prompt vào cùng một lần chat
- Mọi task phải bám:
  - `docs/02-phase-plan.md`
  - `docs/04-db-schema.md`
  - `docs/05-api-design.md`
  - `docs/06-sync-engine-spec.md`
  - `docs/07-workout-data-model.md`
  - `docs/08-auth-model.md`
  - `docs/10-deployment.md`
  - `docs/11-privacy-compliance.md`

## Kiến trúc backend bắt buộc

- `Spring Boot 3 + Java 21 + Maven`
- `Spring Modulith`
- `modular monolith`
- `hexagonal architecture`
- Module chuẩn:
  - `auth`
  - `athlete`
  - `activity`
  - `workout`
  - `calendar`
  - `dashboard`
  - `wellness`
  - `health`
  - `gear`
  - `subscription`
  - `sync`
  - `shared`

## Output bắt buộc sau mỗi task

```text
Implemented
- ...

Validated
- ...

Updated Docs
- ...

Next
- ...
```

## Thứ tự chạy khuyến nghị

1. B01
2. B02
3. B03
4. B04
5. B05
6. B06
7. B07
8. B08
9. B09
10. B10
11. B11
12. B12
13. B13
14. B14
15. B15
16. B16
17. B17
18. B18
19. B19
20. B20

---

## B01 — Backend Infra Scaffold

```text
You are the Backend Infrastructure Engineer for CoachFit. This ticket is only for backend-side scaffold and runtime foundation. You are not allowed to implement product features in this run.

Read first:
- docs/02-phase-plan.md
- docs/10-deployment.md

Task:
- Create backend/
- Create backend Dockerfile
- Create backend pom.xml
- Create docker-compose.yml
- Create docker-compose.dev.yml
- Create .env.example
- Create nginx/ with base config needed by the docs
- Create docs/ai-build-status.md
- Create docs/ai-decisions.md

Constraints:
- Repo may still be docs-only at the start; verify current state first
- Do not implement business APIs yet
- Keep stack exactly as documented

Done when:
- Backend and infra scaffold exists
- Dev/prod compose files exist
- Status docs exist
```

---

## B02 — Backend Modulith Skeleton

```text
You are the Backend Architecture Engineer for CoachFit. This ticket is only for backend architecture skeleton and module boundaries.

Read first:
- docs/02-phase-plan.md
- docs/08-auth-model.md
- docs/10-deployment.md

Task:
- Create Spring Boot backend skeleton as a Spring Modulith
- Create modules:
  - auth
  - athlete
  - activity
  - workout
  - calendar
  - dashboard
  - wellness
  - health
  - gear
  - subscription
  - sync
  - shared
- Inside each module create:
  - domain
  - application/port/in
  - application/port/out
  - application/service
  - adapter/in
  - adapter/out
- Add package-info.java and module metadata where needed
- Add ApplicationModules verification test

Constraints:
- No global root packages like controller/service/repository/model/dto
- No real feature implementation beyond architecture skeleton

Done when:
- Backend builds
- Modulith boundaries are explicit
- Verification test exists
```

---

## B03 — Core Migrations Part 1

```text
You are the Backend Persistence Engineer for CoachFit. This ticket is only for the first core Flyway migrations.

Read first:
- docs/04-db-schema.md
- docs/10-deployment.md

Task:
- Create Flyway migrations for:
  - users
  - subscriptions
  - feature_flags
  - oauth_connections
  - athlete_profiles
  - sport_zones
- Keep naming, constraints, indexes, timestamps, and UUID strategy aligned to the docs

Constraints:
- Only these schema objects in this run
- Do not jump ahead to activity/workout tables yet

Done when:
- Migrations apply cleanly on a fresh database
```

---

## B04 — Shared Security Foundation

```text
You are the Backend Security Foundation Engineer for CoachFit. This ticket is only for shared backend security plumbing needed before feature modules expand.

Read first:
- docs/05-api-design.md
- docs/08-auth-model.md

Task:
- Add shared security foundation for:
  - SecurityConfig
  - JwtTokenProvider
  - JwtAuthenticationFilter
  - ApiKeyAuthenticationFilter skeleton
  - RateLimitFilter skeleton
  - feature gate scaffolding
  - standard API error envelope
  - CORS config
- Keep the filter chain aligned to docs

Constraints:
- No full auth business flow yet if not required
- Do not implement feature-specific controllers here

Done when:
- Security plumbing compiles
- Shared error and filter foundation exists
```

---

## B05 — Auth Module

```text
You are the Backend Auth Engineer for CoachFit. This ticket is only for the auth module.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/08-auth-model.md
- docs/11-privacy-compliance.md

Task:
- Implement auth module use cases, ports, persistence adapters, and web adapters
- Implement:
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/logout
  - GET /auth/oauth/google
  - GET /auth/oauth/google/callback
- Add BCrypt password hashing
- Add JWT access token flow
- Add secure httpOnly refresh cookie flow
- Implement Google OAuth login/register flow according to docs

Constraints:
- Scope is auth only
- Do not implement Strava/Garmin connect in this ticket

Done when:
- Auth endpoints work
- Tests cover core auth flows
```

---

## B06 — Athlete Profile, Zones, Connections

```text
You are the Backend Athlete Domain Engineer for CoachFit. This ticket is only for athlete profile, sport zones, and connection listing/disconnect.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/08-auth-model.md

Task:
- Implement:
  - GET /athlete
  - PUT /athlete
  - GET /athlete/zones
  - PUT /athlete/zones/{sport}
  - GET /athlete/connections
  - DELETE /athlete/connections/{provider}
- Add persistence and validation for athlete profiles and sport zones

Constraints:
- No sync execution in this run
- No coach features

Done when:
- Athlete and zone endpoints work
- Connection list/disconnect surface exists
```

---

## B07 — Activity, Health, And Support Schema Part 2

```text
You are the Backend Persistence Engineer for CoachFit. This ticket is only for the second batch of Flyway migrations and owning persistence adapters needed for Phase 1 product features.

Read first:
- docs/04-db-schema.md

Task:
- Create Flyway migrations for:
  - activities
  - activity_streams
  - activity_laps
  - training_load
  - wellness_logs
  - health_daily_summaries
  - health_sleep_data
  - workouts
  - calendar_events
  - api_keys
  - sync_logs
  - gear
- Add owning module persistence adapters for these tables inside their owning modules

Constraints:
- No business APIs yet in this run
- Keep indexes and dedup constraints aligned to docs

Done when:
- Migrations apply cleanly
- Persistence layer compiles
```

---

## B08 — Manual Upload And File Ingestion

```text
You are the Backend Ingestion Engineer for CoachFit. This ticket is only for manual file upload and ingestion.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md

Task:
- Implement POST /activities/upload
- Store raw files in MinIO
- Detect FIT, TCX, GPX
- Implement parser foundation for:
  - FIT
  - TCX
  - GPX
- Normalize parsed data into:
  - activities
  - activity_streams
  - activity_laps
- Add duplicate detection for manual upload path

Constraints:
- Manual upload only
- Do not implement Strava/Garmin webhook flows here

Done when:
- Upload endpoint works
- Parsed activity data is stored correctly
```

---

## B09 — Strava OAuth Connect

```text
You are the Backend Strava Auth Engineer for CoachFit. This ticket is only for Strava OAuth connect flow.

Read first:
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/08-auth-model.md

Task:
- Implement:
  - GET /auth/oauth/strava
  - GET /auth/oauth/strava/callback
- Store encrypted tokens in oauth_connections
- Link or create user according to docs

Constraints:
- Only OAuth connect/callback in this run
- No webhook sync processing yet

Done when:
- Strava connect flow works
- Tokens are stored securely
```

---

## B10 — Strava Webhook Sync

```text
You are the Backend Strava Sync Engineer for CoachFit. This ticket is only for Strava webhook processing and activity sync.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md

Task:
- Implement:
  - GET /webhooks/strava
  - POST /webhooks/strava
- Add queue/job pipeline for async processing
- Fetch Strava activity summary and streams
- Refresh expired tokens when needed
- Normalize and store/update activities
- Add sync logging

Constraints:
- Webhook must return quickly
- Do not implement Garmin here

Done when:
- Strava webhook path works end-to-end
- Activities sync into internal tables
```

---

## B11 — Garmin OAuth And Push Foundation

```text
You are the Backend Garmin Integration Engineer for CoachFit. This ticket is only for Garmin OAuth 1.0a and callback foundation.

Read first:
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/08-auth-model.md

Task:
- Implement:
  - GET /auth/oauth/garmin
  - GET /auth/oauth/garmin/callback
- Store encrypted Garmin tokens and token secrets
- Add callback handler skeletons for all Garmin push endpoints

Constraints:
- This ticket does not complete health persistence yet
- Keep provider-specific code behind outbound adapters

Done when:
- Garmin connect flow works
- Callback ingress skeleton exists
```

---

## B12 — Garmin Health And Activity Processing

```text
You are the Backend Garmin Data Engineer for CoachFit. This ticket is only for Garmin push processing into internal health and activity models.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/11-privacy-compliance.md

Task:
- Process Garmin callbacks for:
  - dailies
  - activities
  - activity-details
  - sleep
  - body
  - stress
  - hrv
  - pulseox
  - respiration
  - user-metrics
  - deregistration
- Normalize data into:
  - health_daily_summaries
  - health_sleep_data
  - wellness_logs
  - activities where applicable
- Add sync logging

Constraints:
- Garmin only
- Do not expand to unsupported providers

Done when:
- Garmin push data persists correctly
- Wellness autofill path exists
```

---

## B13 — Activities Query APIs

```text
You are the Backend Activity API Engineer for CoachFit. This ticket is only for activities read/update/delete surfaces.

Read first:
- docs/05-api-design.md

Task:
- Implement:
  - GET /activities
  - GET /activities/{id}
  - GET /activities/{id}/streams
  - GET /activities/{id}/laps
  - PUT /activities/{id}
  - DELETE /activities/{id}
  - GET /activities/{id}/download

Constraints:
- Only activity API surfaces
- Keep contracts, filters, and pagination aligned to docs

Done when:
- Activity APIs work against real stored data
```

---

## B14 — Workout Module

```text
You are the Backend Workout Engineer for CoachFit. This ticket is only for the workout module.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/07-workout-data-model.md

Task:
- Create workout schema if not already migrated
- Implement:
  - GET /workouts
  - GET /workouts/{id}
  - POST /workouts
  - PUT /workouts/{id}
  - DELETE /workouts/{id}
  - GET /workouts/templates
- Enforce workout validation rules from the docs

Constraints:
- No calendar logic here
- Keep workout JSON model compatible with later FIT export

Done when:
- Workout CRUD works
- Validation matches docs
```

---

## B15 — Workout FIT Export

```text
You are the Backend Workout Export Engineer for CoachFit. This ticket is only for workout FIT export.

Read first:
- docs/05-api-design.md
- docs/07-workout-data-model.md
- docs/10-deployment.md

Task:
- Implement GET /workouts/{id}/export/fit
- Map internal workout model to FIT export flow
- Use user zones where needed to convert relative targets
- Store export in MinIO if required by the selected implementation

Constraints:
- Export only
- Do not bundle workout CRUD changes unless absolutely required

Done when:
- FIT export works for valid workouts
```

---

## B16 — Calendar Module

```text
You are the Backend Calendar Engineer for CoachFit. This ticket is only for the calendar module.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md

Task:
- Implement:
  - GET /calendar?from=...&to=...
  - POST /calendar
  - PUT /calendar/{id}
  - DELETE /calendar/{id}
  - PUT /calendar/{id}/complete
  - PUT /calendar/{id}/skip
  - POST /calendar/reorder
- Implement state transitions for planned/completed/skipped/partial

Constraints:
- Calendar only
- No coach assignment in this run

Done when:
- Calendar endpoints work
- State logic matches docs
```

---

## B17 — Dashboard, Wellness, Health

```text
You are the Backend Product Surface Engineer for CoachFit. This ticket is only for dashboard, wellness, and health read APIs.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md

Task:
- Implement:
  - GET /dashboard/today
  - GET /dashboard/weekly-summary
  - GET /dashboard/fitness-trend
  - GET /wellness
  - POST /wellness
  - PUT /wellness/{date}
  - GET /health/daily
  - GET /health/sleep
  - GET /health/trends

Constraints:
- Only this slice
- Keep health APIs provider-agnostic

Done when:
- Dashboard, wellness, and health APIs work
```

---

## B18 — Gear, API Keys, Sync Status, Subscription Read

```text
You are the Backend Support Surface Engineer for CoachFit. This ticket is only for gear, API keys, sync status/logs, and subscription read surfaces.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/08-auth-model.md

Task:
- Implement gear CRUD
- Implement API key CRUD
- Implement:
  - GET /sync/status
  - POST /sync/trigger/{provider}
  - GET /sync/logs
  - GET /subscription
- Keep API keys hashed and only visible once on creation

Constraints:
- Only support surfaces in this run
- Do not expand into billing checkout yet unless required

Done when:
- Support APIs work
```

---

## B19 — Feature Gates, Rate Limits, Privacy Surfaces

```text
You are the Backend Hardening Engineer for CoachFit. This ticket is only for tier gating, rate limiting, and privacy/compliance backend surfaces.

Read first:
- docs/05-api-design.md
- docs/08-auth-model.md
- docs/11-privacy-compliance.md

Task:
- Implement feature gate foundation
- Implement rate limit per tier
- Implement Swagger/OpenAPI docs generation if still missing
- Implement consent logging foundation required by privacy docs
- If a consent persistence object is needed and not yet represented elsewhere, create the smallest coherent implementation and record the decision in docs/ai-decisions.md
- Implement:
  - GET /api-keys if still missing
  - GET /account/export
  - DELETE /account
  - POST /account/cancel-deletion
  - PUT /account/restrict
  - GET /account/privacy
- Keep deletion/export/restriction behavior aligned to docs
- Keep privacy/account flows aligned to async export and grace-period deletion expectations from the docs

Constraints:
- No Phase 2 billing logic
- Do not weaken security to simplify delivery

Done when:
- Hardening and privacy surfaces exist
- Core security checks are in place
```

---

## B20 — Backend Deploy, Review, Audit

```text
You are the Backend Release Engineer and Reviewer for CoachFit. This ticket is only for backend-side release readiness: deployment coherence, architecture review, and milestone audit.

Read first:
- docs/02-phase-plan.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md

Task:
- Finalize backend Docker/dev/prod coherence
- Finalize nginx/backend integration if backend-owned changes are needed
- Verify Spring Modulith boundaries
- Review docs/code drift
- Audit whether backend is actually ready for the intended milestone

Required review output:
Implemented
- ...

Validated
- ...

Updated Docs
- ...

Next
- ...
```

---

## Phase 2 Extension Tickets

Chỉ chạy các ticket này sau khi Phase 1 MVP ổn định.

### B21 — Analytics Module

```text
You are the Backend Analytics Engineer for CoachFit. This ticket is only for the analytics module foundation and Pro analytics APIs.

Read first:
- docs/02-phase-plan.md
- docs/05-api-design.md

Task:
- Create analytics module
- Implement:
  - PMC chart API
  - power curve API
  - zone distribution API
- Keep module boundaries clean
```

### B22 — Coach Core Module

```text
You are the Backend Coach Core Engineer for CoachFit. This ticket is only for coach relationships, invites, and access policy.

Read first:
- docs/02-phase-plan.md
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/08-auth-model.md

Task:
- Create coach module
- Implement coach_athletes and coach_invite_links flows
- Implement coach access facade/policy checks
- Keep all coach cross-module access via ports/facades/events
```

### B23 — Coach Data, Assignment, Comments, Notifications

```text
You are the Backend Coach Feature Engineer for CoachFit. This ticket is only for coach data access APIs, workout assignment, comments, and notifications.

Read first:
- docs/02-phase-plan.md
- docs/05-api-design.md

Task:
- Implement coach athlete data APIs
- Implement coach workout assignment APIs
- Implement activity comments APIs
- Implement notifications APIs
```
