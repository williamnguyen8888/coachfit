# Phase Plan — CoachFit

## Phase 1 — MVP (Tháng 1-4)

> **Lưu ý:** Đây là phase plan/spec mục tiêu, **không phản ánh rằng code đã được triển khai**.
>
> **Kiến trúc backend mặc định cho toàn bộ roadmap:** Spring Boot 3 + Java 21 + **Spring Modulith** theo mô hình **modular monolith**. Mỗi business module áp dụng **hexagonal architecture** với cấu trúc chuẩn: `domain`, `application/port/in`, `application/port/out`, `application/service`, `adapter/in`, `adapter/out`. Phase 1 dùng các module chính: `auth`, `athlete`, `activity`, `workout`, `calendar`, `dashboard`, `wellness`, `health`, `gear`, `subscription`, `sync`, cùng `shared` cho cross-cutting concerns. Phase 2 mở rộng thêm `analytics` và `coach` modules.

### Tháng 1: Foundation

**Backend Setup:**
- [ ] Init Spring Boot 3 + Java 21 + Spring Modulith project (Maven)
- [ ] Define application modules và package boundaries: `auth`, `athlete`, `activity`, `workout`, `calendar`, `dashboard`, `wellness`, `health`, `gear`, `subscription`, `sync`, `shared`
- [ ] Establish hexagonal structure trong từng module: `domain`, `application/port/in`, `application/port/out`, `application/service`, `adapter/in`, `adapter/out`
- [ ] Add Spring Modulith boundary verification test (`ApplicationModules.of(...).verify()`)
- [ ] Docker Compose: PostgreSQL + Redis + MinIO + Spring Boot
- [ ] Flyway migration setup
- [ ] DB schema v1 (tất cả core tables theo 04-db-schema.md: users, subscriptions, feature_flags, oauth_connections, athlete_profiles, sport_zones, activities, activity_streams, activity_laps, training_load, wellness_logs, health_daily_summaries, health_sleep_data, workouts, calendar_events, api_keys, sync_logs, gear)
- [ ] Shared cross-cutting foundation: security, feature gating, crypto, exception handling, pagination, ids, time abstractions
- [ ] Auth module: JWT auth flow (register, login, refresh, logout) qua inbound ports + web adapters
- [ ] Auth module: OAuth connect/login flows cho Strava, Google, Garmin với outbound provider adapters
- [ ] Sync module: webhook/job ingress foundation cho Strava và Garmin callbacks
- [ ] Garmin push callback endpoints (dailies, sleep, activities, HRV, stress) qua `sync.adapter.in.webhook`
- [ ] Global exception handler + error format
- [ ] CORS config

**Sync Engine:**
- [ ] Sync module: Strava webhook receiver (POST + GET verify) qua inbound webhook adapter
- [ ] Sync module: Redis queue setup (job producer/consumer) qua queue adapters
- [ ] Sync module: outbound provider adapter cho Strava activity fetch
- [ ] Sync module: FIT file parser (Garmin SDK integration)
- [ ] Sync module: activity normalize + store pipeline qua explicit outbound ports
- [ ] Sync module: MinIO integration (store raw files)

**Frontend Setup:**
- [ ] Init Next.js 15 + TypeScript + Tailwind CSS
- [ ] Design system: CSS tokens (colors, typography, spacing)
- [ ] Layout: sidebar nav (desktop) + bottom tab (mobile)
- [ ] Auth pages: login, register
- [ ] API client (fetch wrapper + JWT handling)

### Tháng 2: Core Features

**Backend:**
- [ ] Activity module: DB schema + persistence adapters cho `activities`, `activity_streams`, `activity_laps`
- [ ] Activity module: upload API (multipart file) qua web adapter + ingestion use case
- [ ] Activity module: list API (paginated, filterable)
- [ ] Activity module: detail API (metrics + streams + laps)
- [ ] Sync module: TCX parser
- [ ] Sync module: GPX parser
- [ ] Sync module: deduplication logic (source-based + fingerprint)
- [ ] Sync module: TSS/NP/IF calculation pipeline
- [ ] Workout module: DB schema + CRUD APIs
- [ ] Calendar module: DB schema + CRUD APIs
- [ ] Calendar module: reorder / complete / skip flows theo API contract
- [ ] Sync + activity modules: training load daily recalculation pipeline (CTL/ATL/TSB)
- [ ] Cross-module rule: các interactions giữa `activity`, `workout`, `calendar`, `sync` chỉ đi qua ports/facades/events, không truy cập trực tiếp repository/entity của nhau

**Frontend:**
- [ ] Activity list page
- [ ] Activity detail page: map (Mapbox/Leaflet) + charts (Recharts)
- [ ] Calendar page: week/month view
- [ ] Calendar: drag-and-drop (dnd-kit)
- [ ] Workout builder: drag-and-drop blocks
- [ ] Workout preview visualization
- [ ] Strava connect/disconnect UI

### Tháng 3: Dashboard & Polish

**Backend:**
- [ ] Dashboard module: APIs cho today's workout, weekly summary, fitness trend
- [ ] Wellness module: `wellness_logs` schema + persistence adapter
- [ ] Wellness module: check-in API
- [ ] Workout + sync modules: FIT file export (workout → .fit) qua explicit export port
- [ ] Auth/shared security: API key generation + authentication
- [ ] Shared security: rate limiting middleware (Redis sliding window)
- [ ] Shared docs/config: Swagger/OpenAPI docs generation
- [ ] Gear module: `gear` schema + CRUD API
- [ ] Add focused module integration tests cho `auth`, `activity`, `workout`, `calendar`, `sync`

**Frontend:**
- [ ] Dashboard page: morning briefing
- [ ] Weekly volume bar chart
- [ ] Fitness trend sparkline
- [ ] Wellness check-in UI (emoji selector)
- [ ] Onboarding wizard (3-step)
- [ ] Settings page: profile, zones, connections, API keys
- [ ] Dark mode implementation
- [ ] Responsive mobile layout

### Tháng 4: Beta Launch

**Infrastructure:**
- [ ] Shared feature system (DB + annotation + filter) không phá module boundaries
- [ ] Subscription module: tier model (DB + API)
- [ ] Premium feature gate: `@RequiresTier` annotation
- [ ] Rate limit per tier enforcement
- [ ] PWA: service worker + manifest.json
- [ ] Error tracking setup (Sentry hoặc tương đương)
- [ ] Logging chuẩn hóa
- [ ] Docker production build optimization cho `backend-api` và `backend-worker` cùng một modulith codebase
- [ ] Nginx reverse proxy + SSL (Let's Encrypt)
- [ ] Deploy lên VPS production
- [ ] Run Spring Modulith boundary verification trong CI / release checklist
- [ ] Internal testing: 10-20 người quen
- [ ] Bug fixes
- [ ] Closed beta: mời 50-100 users

### ✅ Milestone Tháng 4
> Beta live, 100 users, core workflow hoạt động: sync → calendar → workout → dashboard

---

## Phase 2 — Phân Tích & Coach (Tháng 5-9)

### Tháng 5-6: Advanced Analytics
- [ ] Introduce `analytics` module theo Spring Modulith + hexagonal structure
- [ ] PMC chart API + UI (CTL/ATL/TSB over time)
- [ ] Power duration curve API + UI
- [ ] Zone distribution API + UI (per activity + per period)
- [ ] Season/period comparison
- [ ] Sync module: Garmin Connect sync adapter
- [ ] Auth/sync modules: Garmin OAuth implementation

### Tháng 7-8: Coach System

**Backend — Coach Core:**
- [ ] Create `coach` module theo Spring Modulith + hexagonal structure
- [ ] DB: coach_athletes, coach_invite_links, activity_comments, notifications tables
- [ ] Coach role upgrade flow (athlete → coach khi mua Coach tier)
- [ ] Coach access facade / policy port: permission check per athlete per action
- [ ] `@PreAuthorize("@coachAccess.hasAccess(#athleteId, 'readActivities')")` pattern
- [ ] Coach invite by email: generate JWT token (7d TTL), send email
- [ ] Coach invite by shareable link: create/manage/deactivate links
- [ ] Invite accept flow: token validate → status='active' → coach gets access
- [ ] Athlete revoke coach: DELETE /athlete/coach → status='revoked'
- [ ] Coach revoke athlete: DELETE /coach/athletes/{id} → status='revoked'
- [ ] Cross-module rule: `coach` không đọc trực tiếp repository/entity nội bộ của `activity`, `calendar`, `health`, `wellness`; mọi access đi qua ports/facades/events

**Backend — Coach Data Access:**
- [ ] GET /coach/athletes — roster with fitness status (CTL/ATL/TSB), tags
- [ ] GET /coach/athletes/{id}/dashboard — athlete overview + alerts
- [ ] GET /coach/athletes/{id}/activities — paginated with filters
- [ ] GET /coach/athletes/{id}/activities/{actId} — detail + streams
- [ ] GET /coach/athletes/{id}/calendar — athlete calendar
- [ ] GET /coach/athletes/{id}/wellness — wellness history
- [ ] GET /coach/athletes/{id}/health/daily — health data
- [ ] GET /coach/athletes/{id}/training-load/pmc — PMC chart data
- [ ] GET /coach/athletes/{id}/zones — sport zones

**Backend — Workout Assignment:**
- [ ] POST /coach/athletes/{id}/calendar — assign workout to athlete
- [ ] POST /coach/athletes/bulk-assign — assign to multiple athletes
- [ ] calendar_events: add `assigned_by` field (null / 'coach')
- [ ] Notification on assign: athlete nhận thông báo
- [ ] Notification on complete: coach nhận thông báo + compliance_score

**Backend — Comments:**
- [ ] Activity comments CRUD: POST, GET, PUT, DELETE
- [ ] Threaded replies (parent_id)
- [ ] Notification on new comment

**Backend — Notifications:**
- [ ] Notifications CRUD: list (paginated), mark read, mark all read, unread count
- [ ] Notification types: coach_invite, workout_assigned, workout_completed, comment_added, alert_overtraining, alert_missed_workout
- [ ] Alert engine: scheduled job detect overtraining (TSB < -20), missed workouts, elevated resting HR
- [ ] Athlete permission management: GET/PUT /athlete/coach/permissions

**Frontend — Coach UI:**
- [ ] Coach dashboard page: roster panel + athlete detail panel
- [ ] Athlete card: avatar, name/nickname, CTL/ATL/TSB, status indicator (🟢/🟡/🔴)
- [ ] Athlete detail: tabs (Calendar | Activities | PMC | Health | Notes)
- [ ] Invite modal: email invite + shareable link generator
- [ ] Pending invites list
- [ ] Athlete tag management
- [ ] Coach notes editor (per athlete)
- [ ] Workout assignment modal: select workout → select athletes → select date
- [ ] Bulk assign UI
- [ ] Alert feed component (missed workouts, overtraining risk)

**Frontend — Shared:**
- [ ] Activity comments component (threaded)
- [ ] Notification bell + dropdown
- [ ] Notification list page
- [ ] Athlete-side: coach info card + permission toggles in Settings

### Tháng 9: Growth & Revenue
- [ ] Shareable links (workout, plan — public pages)
- [ ] Stripe integration: checkout, portal, webhooks
- [ ] Pro/Elite/Coach tier activation flow
- [ ] Coach-specific onboarding (after upgrade)
- [ ] COROS sync adapter
- [ ] Wahoo sync adapter
- [ ] Open beta launch
- [ ] Landing page + marketing site

### ✅ Milestone Tháng 9
> 2,000 users, 200 paid, Pro tier live, revenue validated

---

## Phase 3 — Intelligence (Tháng 10-18)

- [ ] AI weekly training summary (LLM integration)
- [ ] AI rest day suggestion (rule-based → ML)
- [ ] Auto FTP/LTHR detection from activities
- [ ] Coach marketplace (plan listing, purchase flow)
- [ ] Team/club features
- [ ] Payment: coach subscription tier
- [ ] Import from Intervals.icu (bridge mode via API)

### ✅ Milestone Tháng 18
> 25,000 users, 1,000 paid, coach ecosystem active

---

## Phase 4 — Scale (Tháng 18+)

- [ ] AI workout generation
- [ ] AI recovery analysis
- [ ] Native mobile app (React Native / Flutter — iOS first)
- [ ] White-label for coaches/brands
- [ ] Zwift, ROUVY integration
- [ ] Developer API v2 + third-party app marketplace
- [ ] Scale infrastructure (separate services if needed)

### ✅ Milestone Tháng 24
> 100,000 users, 5,000 paid, $80-100K MRR

---

## Bảng Milestone Tổng Kết

| Tháng | Milestone | Metric thành công |
|---|---|---|
| 3 | Alpha nội bộ | Sync + Calendar + Workout hoạt động |
| 4 | Closed beta | 100 users, 0 critical bugs |
| 6 | Analytics live | PMC + Power curve available |
| 9 | Revenue start | 200 paid users, Pro tier active |
| 12 | PMF confirmed | 60%+ monthly retention |
| 18 | Coach ecosystem | 50 coaches, 1K paid |
| 24 | Scale ready | 100K users, $80K MRR |

## Nguyên Tắc Xuyên Suốt

- **Ship fast, iterate faster** — 2 tuần/sprint
- **Mỗi tháng** phải có user-facing improvement
- **Mỗi quarter** chỉ 1 theme chính — không lan man
- **Done > perfect** — launch với 80% quality, polish sau
- **Measure** — mỗi feature phải có metric đo lường
