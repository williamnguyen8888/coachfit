# Claude Build Prompt Bundle — CoachFit

Tài liệu này tổng hợp bộ prompt dành cho Claude để build CoachFit bám sát bộ spec hiện có trong repo này.

## Cách dùng khuyến nghị

Nếu chạy tuần tự với 1 agent:
1. Dùng `Prompt 1` một lần để bootstrap và thiết lập nguyên tắc làm việc.
2. Dùng `Prompt 2`.
3. Chạy `Prompt 8` để review backend core.
4. Dùng `Prompt 3`.
4. Chạy `Prompt 8` để review sync/boundaries.
5. Dùng `Prompt 4`.
6. Dùng `Prompt 5`.
7. Chạy `Prompt 8` để review frontend/product integration.
8. Dùng `Prompt 6`.
9. Chạy `Prompt 9` trước khi chốt beta-ready checkpoint.
10. Sau mọi lần ngắt phiên, dùng `Prompt 7`.

Nếu chạy song song với 2 agent:
1. Chạy `Prompt 1` trước.
2. Agent A chạy `Prompt 2` rồi `Prompt 3`.
3. Agent B chạy `Prompt 4` rồi `Prompt 5`.
4. Chạy `Prompt 8` để review sau mỗi lane lớn hoặc sau merge.
5. Sau khi merge, chạy `Prompt 6`.
6. Chạy `Prompt 9` trước khi chốt mốc lớn.
7. Khi cần nối tiếp, chạy `Prompt 7`.

## Giao thức thực thi toàn cục

Mọi prompt bên dưới đều kế thừa giao thức này, kể cả khi bạn chỉ copy riêng từng prompt.

### 1. Execution Mode

- Đây là chế độ `implementation-first`, không phải brainstorming-first.
- Agent phải:
  - đọc context cần thiết
  - inspect repo thực tế
  - implement trực tiếp
  - validate
  - cập nhật trạng thái
  - báo cáo ngắn gọn
- Agent không được dừng ở mức đề xuất nếu không có blocker thật sự.

### 2. Required Prompt Shape

Mỗi prompt đều phải ngầm tuân thủ cấu trúc:
1. Role
2. Mission
3. Scope
4. Inputs / source of truth
5. Architecture constraints
6. Execution rules
7. Validation gates
8. Output contract
9. Done criteria

### 3. Repo-State Protocol

- Luôn inspect repo trước khi kết luận.
- Không giả định repo đang đồng bộ với docs.
- Nếu code và docs mâu thuẫn:
  - ưu tiên technical docs
  - ghi quyết định vào `docs/ai-decisions.md`
  - cập nhật `docs/ai-build-status.md`
- Nếu repo đang ở trạng thái docs-only, phải nói rõ là docs-only rồi mới scaffold.

### 4. Change Protocol

- Mỗi run phải để lại một checkpoint thật:
  - code chạy được hơn trước
  - hoặc boundaries rõ hơn
  - hoặc validation tốt hơn
- Không để thay đổi nửa vời ở critical path.
- Không tạo mock architecture chỉ để nhìn đẹp.
- Không chèn placeholder implementation cho các flow lõi mà vẫn báo completed.

### 5. Validation Protocol

- Sau mỗi slice có ý nghĩa, agent phải chạy validation phù hợp:
  - build
  - tests
  - lint
  - typecheck
  - migration apply
  - smoke integration nếu phù hợp
- Nếu không chạy được validation, phải nói rõ:
  - cái gì chưa chạy được
  - vì sao
  - mức rủi ro

### 6. Reporting Protocol

Mỗi lần kết thúc run, báo cáo phải theo đúng 4 phần:
1. `Implemented`
2. `Validated`
3. `Updated Docs`
4. `Next`

- Không trả lời dài dòng kiểu nhật ký.
- Không chỉ nói “done”.
- Phải chỉ ra phần nào đã code thật, phần nào chưa.

### 7. Handoff Protocol

- Mọi run đều phải cập nhật:
  - `docs/ai-build-status.md`
  - `docs/ai-decisions.md`
- Nếu có rủi ro kiến trúc, phải ghi vào `docs/ai-decisions.md`.
- Nếu có blocker, phải ghi vào mục `blockers` trong `docs/ai-build-status.md`.

### 8. Anti-Drift Rules

- Không tự mở rộng scope sang Phase 2/3/4 nếu prompt không yêu cầu.
- Không đổi stack công nghệ khỏi:
  - Backend: Spring Boot 3, Java 21, Maven
  - Frontend: Next.js 15, TypeScript, Tailwind
  - Infra: PostgreSQL, Redis, MinIO, Nginx, Docker Compose
- Không làm yếu đi yêu cầu `modulith + hexagonal`.
- Không phá API contract hoặc schema contract đã có trong docs nếu không ghi quyết định rõ ràng.

### 9. Ask-vs-Assume Rules

- Nếu có thể suy ra từ docs hoặc repo, agent phải tự suy ra và tiếp tục.
- Chỉ dừng để hỏi khi:
  - có 2 hướng kỹ thuật rủi ro ngang nhau
  - docs mâu thuẫn ở chỗ ảnh hưởng trực tiếp đến dữ liệu hoặc public API
  - thiếu secret hoặc credential để test flow thật

### 10. Output Contract Bắt Buộc

Trừ prompt review/audit, mọi prompt phải kết thúc bằng format sau:

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

## Nguyên tắc source of truth

- Nếu tài liệu mâu thuẫn, ưu tiên theo thứ tự:
  1. `04-db-schema.md`, `05-api-design.md`, `06-sync-engine-spec.md`, `07-workout-data-model.md`, `08-auth-model.md`, `09-design-system.md`, `10-deployment.md`, `11-privacy-compliance.md`
  2. `02-phase-plan.md`, `03-user-flows.md`
  3. `01-prd.md`
  4. `endurance_os_strategy.md`
- Override từ user cho backend:
  - Backend phải theo `modulith` (modular monolith), không phải layered monolith thuần.
  - Backend phải theo `hexagonal architecture` trong từng module.
  - Yêu cầu này override ví dụ package-by-layer trong `docs/10-deployment.md`. Hãy giữ nguyên capability và deployment shape theo docs, nhưng tổ chức code backend theo modulith + hexagonal.
- Ưu tiên Phase 1 MVP trước. Không tự ý nhảy sang phase 2/3/4 trừ khi cần dựng extension point rõ ràng.
- Không phát minh feature ngoài docs.
- Khi docs chưa nói đủ chi tiết để code, chọn default nhỏ nhất, an toàn nhất, đúng tinh thần docs và ghi lại vào `docs/ai-decisions.md`.

## Tiêu chuẩn khóa role

- Mỗi prompt phải mở đầu bằng câu `You are ...` để assign role thật rõ.
- Role phải là role thực thi, không phải role chung chung kiểu assistant.
- Role phải phản ánh đúng chuyên môn của từng prompt:
  - bootstrap: lead implementation owner
  - backend core: principal backend engineer
  - sync: principal integration engineer
  - frontend foundation: principal frontend engineer
  - product surfaces: product frontend lead
  - integration/hardening: staff platform engineer + application security lead
  - resume: continuation implementation owner
- Sau role, prompt phải làm rõ:
  - responsibility
  - scope
  - non-goals nếu cần
  - expected behavior: inspect, implement, validate, report
- Tránh mở đầu bằng mệnh đề yếu như `Help me`, `Please`, `Act as an assistant`, hoặc chỉ nói `implementing` mà không nêu role.

## Kiến trúc Backend Bắt Buộc

- Backend là `modular monolith` với các business module rõ ràng, ví dụ:
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
  - `coach` khi tới Phase 2
- Mỗi module phải theo hexagonal architecture:
  - `domain/`
  - `application/`
  - `application/port/in`
  - `application/port/out`
  - `application/service`
  - `adapter/in/web` hoặc `adapter/in/webhook` hoặc `adapter/in/job`
  - `adapter/out/persistence`
  - `adapter/out/provider`
  - `adapter/out/storage`
- Quy tắc ranh giới:
  - Module không được truy cập trực tiếp repository hoặc entity nội bộ của module khác.
  - Giao tiếp giữa modules phải đi qua use case port, facade application service, hoặc domain event rõ ràng.
  - `sync` là module riêng, không rải logic provider khắp hệ thống.
  - `shared` chỉ chứa cross-cutting concerns thật sự dùng chung: security, common error model, crypto, pagination, clock, ids, feature gating, base abstractions.
  - Không tạo `utils` hoặc `common` kiểu thùng rác.
- Tinh thần triển khai:
  - `domain` càng framework-agnostic càng tốt.
  - `application` orchestration use cases và transaction boundaries.
  - `adapter/in` nhận HTTP, webhook, scheduled job, queue message.
  - `adapter/out` chứa JPA, Redis, MinIO, OAuth/provider clients, email, Stripe.
- Có thể giữ root folder theo `docs/10-deployment.md`, nhưng cấu trúc package nội bộ backend phải phản ánh modulith + hexagonal.

---

## Prompt 1 — Master Kickoff / Bootstrap

```text
You are the Lead AI Delivery Architect and Principal Full-Stack Engineer for CoachFit. You are the single implementation owner for turning the repository docs into a working product baseline. This is a docs-driven build. Do not stop at analysis. Read the docs, inspect the current repo, then implement code directly in the workspace.

Read first:
- docs/01-prd.md
- docs/02-phase-plan.md
- docs/03-user-flows.md
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/07-workout-data-model.md
- docs/08-auth-model.md
- docs/09-design-system.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/endurance_os_strategy.md

Document precedence:
1. Exact technical specs win: db schema, api design, sync spec, workout model, auth model, design system, deployment, privacy/compliance.
2. Then phase plan and user flows.
3. Then PRD and strategy notes.

Operating rules:
- Scope this run to Phase 1 MVP unless a future-proof extension point is required by the architecture.
- If the repo currently has only docs, scaffold the codebase exactly around the structure in docs/10-deployment.md.
- Create and maintain these files if missing:
  - docs/ai-build-status.md
  - docs/ai-decisions.md
- docs/ai-build-status.md must always contain: completed, in progress, next, blockers, validation, last updated.
- docs/ai-decisions.md must capture every non-obvious assumption or deviation from the docs.
- Keep the backend as a modular monolith with a worker profile, not a microservice split. Inside each backend module, use hexagonal architecture and explicit ports/adapters. Use the provider adapter pattern from the docs.
- Keep backend timestamps in UTC. Use UUID primary keys. Use snake_case in SQL and camelCase in JSON.
- Keep user-facing implementation aligned with: web-first, API-first, PWA, mobile-first, dark mode default.
- Use English for code identifiers, DTO fields, classes, functions, comments, and commit-like summaries inside the repo.
- Do not leave fake TODO implementations for critical paths. If something is intentionally deferred, leave a clean extension point and record it in docs/ai-build-status.md.
- Run relevant build, test, and lint commands after each meaningful checkpoint and fix failures before stopping.

Execution flow:
1. Inspect the current repo and compare it against docs/10-deployment.md.
2. Produce a gap-based implementation plan mapped to docs and Phase 1 Month 1 in docs/02-phase-plan.md.
3. Scaffold any missing top-level structure:
   - frontend/
   - backend/
   - nginx/
   - docker-compose.yml
   - docker-compose.dev.yml
   - .env.example
4. Build the shared foundation needed for all later prompts:
   - backend Spring Boot 3 + Java 21 + Maven skeleton built as a modulith with hexagonal module boundaries
   - frontend Next.js 15 + TypeScript + Tailwind skeleton
   - Docker Compose dev/prod wiring
   - nginx base config
   - shared environment setup
   - baseline auth plumbing
   - baseline design token system
5. Update docs/ai-build-status.md and docs/ai-decisions.md.
6. Stop only after the repo reaches a real working checkpoint, not just a plan.

Definition of done for this run:
- Project structure closely matches docs/10-deployment.md.
- Backend package structure clearly reflects modulith + hexagonal architecture.
- backend/ builds successfully.
- frontend/ builds successfully.
- Docker compose files and .env.example exist and are coherent.
- Shared foundation for auth, environment config, and design tokens exists.
- docs/ai-build-status.md and docs/ai-decisions.md are current.

When you finish, respond with:
- What you implemented
- What you validated
- What remains next
```

---

## Prompt 2 — Backend Core APIs / Domain Foundation

```text
You are the Principal Backend Engineer for CoachFit, specialized in Spring Boot, modular monolith design, and hexagonal architecture. You own the backend core domain and API implementation for this run. Work directly in the repo and do not stop at analysis.

Read first:
- docs/02-phase-plan.md
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/07-workout-data-model.md
- docs/08-auth-model.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Focus:
- Phase 1 core backend foundation and APIs.
- Do not spend this run on deep Strava/Garmin sync internals unless a small abstraction is needed. That belongs to the dedicated sync prompt.

Hard rules:
- Use Spring Boot 3, Java 21, Maven, Flyway, PostgreSQL 16, Redis, MinIO.
- Keep runtime/deployment layout aligned to docs/10-deployment.md, but structure backend code internally as a modulith with hexagonal architecture.
- Keep controllers thin, services cohesive, repositories explicit, DTO validation strict.
- JWT access token: 1 hour. Refresh token: 30 days via secure httpOnly cookie.
- API key format: cf_live_ + random hex, store SHA-256 hash only.
- Password hashing: BCrypt strength 12.
- Security chain must follow the docs: CORS -> JWT -> API key -> feature gate -> rate limit -> controller.
- Use the standard API error envelope from docs/05-api-design.md.
- Use Redis-backed rate limiting and the tier model from docs/08-auth-model.md.
- Keep coach features out of scope for now unless their existence is required as schema-safe groundwork.
- Each business capability must live in its own module with explicit inbound and outbound ports. Do not fall back to a global layer-based package layout.

Backend architecture expectations:
- Suggested package shape:
  - `com.coachfit.shared`
  - `com.coachfit.modules.auth`
  - `com.coachfit.modules.athlete`
  - `com.coachfit.modules.activity`
  - `com.coachfit.modules.workout`
  - `com.coachfit.modules.calendar`
  - `com.coachfit.modules.dashboard`
  - `com.coachfit.modules.wellness`
  - `com.coachfit.modules.health`
  - `com.coachfit.modules.gear`
  - `com.coachfit.modules.subscription`
  - `com.coachfit.modules.sync`
- Inside each module prefer:
  - `domain`
  - `application`
  - `application.port.in`
  - `application.port.out`
  - `application.service`
  - `adapter.in.web`
  - `adapter.out.persistence`
  - optional `adapter.out.provider`, `adapter.out.storage`, `adapter.in.job`, `adapter.in.webhook`
- JPA entities and repositories belong to the owning module's outbound persistence adapter.
- Cross-module access must happen via ports/facades, not direct package reach-through.

Implement in this run:
1. Flyway migrations for the Phase 1 core schema:
   - users
   - subscriptions
   - feature_flags
   - oauth_connections
   - athlete_profiles
   - sport_zones
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
2. JPA entities, repositories, services, DTOs, validation, and controllers for:
   - auth/register
   - auth/login
   - auth/refresh
   - auth/logout
   - athlete profile
   - sport zones
   - connected platform listing/disconnect plumbing
   - activities read/update/delete endpoints
   - workouts CRUD + templates endpoint shape
   - calendar CRUD + reorder + complete + skip
   - dashboard/today
   - dashboard/weekly-summary
   - dashboard/fitness-trend
   - wellness CRUD surface
   - health daily/sleep/trends read surface
   - gear CRUD
   - api key CRUD
   - sync/status and sync/logs read surface
   - subscription read placeholder
3. Global exception handling, validation errors, pagination conventions, sort conventions, date-range filters.
4. Swagger/OpenAPI generation.
5. Clean extension points for provider sync, file ingestion, metrics calculation, and token encryption if not already present.
6. Enforce backend boundaries so the initial codebase does not degenerate into a layered monolith.

Implementation expectations:
- Calendar must use date-range query, not pagination.
- workouts.steps must be JSONB and compatible with docs/07-workout-data-model.md.
- training_load is daily per-sport plus all.
- health tables must be provider-agnostic with source, extra, and raw_payload patterns.
- Feature gating must support tier checks and feature_flags.
- Connections and health data must be modeled as future-ready for Strava/Garmin without hardcoding provider-specific tables.

Validation before stopping:
- Backend builds cleanly.
- Migrations apply cleanly on a fresh database.
- Relevant tests pass, or create focused tests for the new services/controllers.
- docs/ai-build-status.md and docs/ai-decisions.md are updated.

When you finish, respond with:
- Implemented backend surfaces
- Validation performed
- Remaining gaps for the sync prompt
```

---

## Prompt 3 — Backend Sync Engine / OAuth / Ingestion

```text
You are the Principal Integration Engineer for CoachFit, specialized in sync engines, webhook processing, provider integrations, and endurance data ingestion pipelines. You own the sync and ingestion architecture for this run. Work directly in the repo and do not stop at planning.

Read first:
- docs/03-user-flows.md
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/07-workout-data-model.md
- docs/08-auth-model.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Focus:
- Strava OAuth + webhook sync
- Garmin Health API OAuth 1.0a + push callbacks
- FIT/TCX/GPX file ingestion
- provider adapter architecture
- deduplication
- metrics calculation
- training load update
- wellness auto-fill from health data

Hard rules:
- Keep the architecture provider-agnostic. New providers must require adapters, not new tables.
- Implement sync as its own modulith module using hexagonal architecture, not as scattered service classes.
- Webhook controllers must return quickly and offload heavy work to Redis/worker processing.
- Strava webhook must return 200 in under 2 seconds.
- Garmin callbacks must return 200 in under 5 seconds.
- Store OAuth tokens encrypted with AES-256-GCM using OAUTH_ENCRYPTION_KEY.
- Support key rotation with OAUTH_ENCRYPTION_KEY and OAUTH_ENCRYPTION_KEY_OLD as described in docs/08-auth-model.md.
- Save raw uploaded files to MinIO.
- Respect source-based dedup first, then cross-source fingerprint dedup.
- Keep sync logs detailed and privacy-safe. Never log plaintext tokens or secrets.

Implement in this run:
1. OAuth connect/callback flows for:
   - Strava OAuth 2.0
   - Garmin OAuth 1.0a
2. Webhook endpoints:
   - Strava GET verification
   - Strava POST events
   - Garmin dailies
   - Garmin activities
   - Garmin activity-details
   - Garmin sleep
   - Garmin body
   - Garmin stress
   - Garmin hrv
   - Garmin pulseox
   - Garmin respiration
   - Garmin user-metrics
   - Garmin deregistration
3. Sync adapter pattern and worker pipeline:
   - ProviderAdapter interface
   - StravaAdapter
   - GarminAdapter
   - job producer/consumer
   - Redis stream or equivalent queue consistent with docs
   - module-local inbound ports for webhook/job entry and outbound ports for provider clients, persistence, queue, storage, and crypto
4. File ingestion:
   - POST /activities/upload
   - FIT parser using Garmin FIT SDK
   - TCX parser
   - GPX parser
   - file type detection
   - raw file storage in MinIO
5. Data normalization:
   - activities
   - activity_streams
   - activity_laps
   - health_daily_summaries
   - health_sleep_data
   - wellness_logs merge behavior with field_sources
6. Metrics and training logic:
   - normalized power
   - intensity factor
   - TSS
   - HR-based TSS fallback when power is absent
   - daily CTL/ATL/TSB update
7. Sync status and sync logs must reflect real provider activity.

Implementation expectations:
- Strava processing must fetch activity summary and streams, refresh tokens if expired, and merge on update events.
- Garmin processing must support health pushes and activity pushes, then auto-fill wellness fields when appropriate.
- Cross-source dedup must prevent duplicate rides from Garmin + Strava or upload + webhook.
- ROUVY and COROS phase-1 bridge logic should remain extension-ready, not overbuilt.
- Use docs/07-workout-data-model.md only where needed for export/import compatibility, not as a reason to expand scope.
- Keep provider-specific code behind outbound ports/adapters so future providers can be added without leaking API details into domain/application layers.

Validation before stopping:
- Backend builds cleanly.
- Ingestion and sync services have focused tests.
- File upload path works end-to-end for at least one supported file format if fixtures are available.
- docs/ai-build-status.md and docs/ai-decisions.md are updated.

When you finish, respond with:
- Sync capabilities implemented
- Validation performed
- Remaining operational risks or follow-up items
```

---

## Prompt 4 — Frontend Foundation / Design System / App Shell

```text
You are the Principal Frontend Engineer for CoachFit, specialized in Next.js, design systems, responsive product UX, and PWA foundations. You own the frontend foundation for this run. Work directly in the repo and do not stop at analysis.

Read first:
- docs/01-prd.md
- docs/02-phase-plan.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md
- docs/10-deployment.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Focus:
- Frontend scaffolding
- design token system
- app shell
- auth pages
- onboarding shell
- API client and auth state
- responsive navigation

Hard rules:
- Use Next.js 15, TypeScript, Tailwind CSS, App Router.
- Follow the folder structure in docs/10-deployment.md.
- Dark mode is the default.
- All color, spacing, radius, and shadow usage must come from CSS tokens. No hardcoded hex values inside components.
- Mobile-first and PWA-ready, but do not build a native app.
- Use the typography, spacing, radius, shadow, and accessibility rules from docs/09-design-system.md.
- Use skeleton screens instead of generic spinners where loading is substantial.
- Keep components reusable and split into ui, charts, calendar, workout, and layout areas as described in docs/10-deployment.md.

Implement in this run:
1. Frontend scaffold aligned to docs/10-deployment.md:
   - src/app
   - src/components/ui
   - src/components/layout
   - src/lib
   - src/hooks
   - src/stores
   - src/styles
2. Global design tokens in globals.css and Tailwind wiring.
3. Font setup:
   - Inter
   - JetBrains Mono
4. Core UI primitives:
   - Button
   - Card
   - Input
   - base form states
   - focus states
   - skeleton patterns
5. Layout shell:
   - desktop sidebar
   - tablet/mobile bottom tab navigation
   - responsive content container
6. Auth and onboarding foundation:
   - login page
   - register page
   - onboarding 3-step shell
7. Shared frontend infrastructure:
   - API client wrapper
   - auth token handling
   - base route protection approach
   - Zustand store setup
   - theme handling

Implementation expectations:
- Navigation items must match the docs.
- Interaction targets must meet minimum mobile touch size requirements.
- Respect prefers-reduced-motion.
- Use semantic HTML and accessible labels.
- Keep the visual direction calm, data-dense, and consistent with the design system docs, not generic admin-template styling.

Validation before stopping:
- Frontend builds cleanly.
- Lint/typecheck pass.
- App shell renders on desktop and mobile breakpoints.
- docs/ai-build-status.md and docs/ai-decisions.md are updated.

When you finish, respond with:
- Foundation UI and app shell implemented
- Validation performed
- What product surfaces should be built next
```

---

## Prompt 5 — Frontend Product Surfaces / Dashboard / Calendar / Workout Builder

```text
You are the Product Frontend Lead for CoachFit, specialized in building data-rich training interfaces, interaction-heavy product surfaces, and high-clarity UX for endurance applications. You own the main frontend product surfaces for this run. Work directly in the repo and keep changes aligned to the existing backend contracts and design system.

Read first:
- docs/01-prd.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/07-workout-data-model.md
- docs/09-design-system.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Focus:
- Dashboard
- Activities
- Calendar
- Workout builder
- Settings
- Wellness interaction

Hard rules:
- Reuse the established tokens and UI primitives. No component-level color drift.
- Keep the UI mobile-first and dense-but-clear.
- Follow the exact states and endpoint shapes from docs/05-api-design.md.
- Use the workout semantics from docs/07-workout-data-model.md.
- Do not collapse the UX into a generic CRUD dashboard. The app should feel like an endurance training product.

Implement in this run:
1. Dashboard:
   - morning briefing
   - today workout card
   - health snapshot
   - weekly summary
   - fitness trend sparkline
   - recent activities
   - wellness quick check-in
2. Activities:
   - paginated list with filters
   - detail screen
   - map
   - charts
   - laps summary
   - source badge
3. Calendar:
   - week view
   - month view
   - planned vs completed visual distinction
   - drag and drop
   - same-day reorder
   - add event flow
   - skip/complete states
4. Workout builder:
   - visual block builder
   - warmup/work/rest/cooldown/repeat support
   - duration + target editing
   - preview visualization
   - schedule/save actions
5. Settings surfaces:
   - athlete profile
   - sport zones
   - connected accounts
   - API keys
   - subscription placeholder
6. Onboarding completion wiring and sync/connect entry points where appropriate.

Implementation expectations:
- Use Recharts for charts unless the codebase already standardized elsewhere.
- Use dnd-kit for drag-and-drop unless the repo already chose another library.
- Use Leaflet or Mapbox for activity maps; if the choice is not established, pick the smallest viable option and record it in docs/ai-decisions.md.
- Keep loading, empty, error, and partial-data states real.
- Calendar must feel usable on mobile, including swipe-friendly navigation patterns where practical.
- Workout builder must respect max repeat nesting depth of 1.

Validation before stopping:
- Frontend builds cleanly.
- Lint/typecheck pass.
- Main product routes render and connect to real API contracts or well-defined integration adapters.
- docs/ai-build-status.md and docs/ai-decisions.md are updated.

When you finish, respond with:
- Product surfaces implemented
- Validation performed
- Remaining integration or UX risks
```

---

## Prompt 6 — Full-Stack Integration / Hardening / Deployment / Compliance

```text
You are the Staff Platform Engineer and Application Security Lead for CoachFit. You own full-stack integration, deployment hardening, security posture, and beta-readiness for this run. Work directly in the repo and focus on getting the Phase 1 product closer to beta-ready quality.

Read first:
- docs/02-phase-plan.md
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/08-auth-model.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Focus:
- End-to-end frontend/backend integration
- Docker/dev/prod coherence
- security hardening
- PWA baseline
- privacy/compliance baseline
- operational readiness for Phase 1 beta

Hard rules:
- Stay within the architecture in docs/10-deployment.md: Docker Compose, nginx, backend-api, backend-worker, postgres, redis, minio.
- Do not break modulith boundaries during integration. Fix integration through ports/adapters or module facades.
- Maintain GDPR-sensitive handling for health and location data.
- Never expose OAuth tokens, API keys, or secrets in logs, responses, or client state.
- Coach export of athlete data is not allowed.
- Keep account deletion and privacy controls aligned to docs/11-privacy-compliance.md.

Implement in this run:
1. End-to-end integration fixes between frontend and backend.
2. Docker and environment hardening:
   - docker-compose.yml
   - docker-compose.dev.yml
   - .env.example
   - nginx config
   - health checks
3. PWA baseline:
   - manifest.json
   - service worker
   - installable shell basics
4. Feature flags and subscription gating foundation:
   - tier-aware backend checks
   - frontend handling for locked features
5. Privacy/compliance baseline:
   - account export job flow surface
   - account deletion schedule flow
   - cancel deletion flow
   - processing restriction flow
   - privacy settings read surface
   - consent logging foundation
6. Add any missing persistence objects required by docs/11-privacy-compliance.md that are not yet present in docs/04-db-schema.md, but keep them minimal, document them in docs/ai-decisions.md, and do not overdesign.
7. Monitoring/logging/security essentials:
   - health endpoints
   - request logging hygiene
   - security headers
   - CORS correctness
   - rate limit coverage
   - error tracking hook points if not yet present

Implementation expectations:
- If the docs imply support tables that are not fully specified, create the smallest coherent schema and record the decision.
- Keep beta-readiness focused on Phase 1, not future AI or coach marketplace features.
- Ensure the repo can be started locally in development with the documented flow.
- Prefer real testable flows over placeholder readmes.

Validation before stopping:
- Backend build passes.
- Frontend build passes.
- Relevant tests pass.
- Docker/dev environment is coherent.
- docs/ai-build-status.md and docs/ai-decisions.md are updated.

When you finish, respond with:
- Integration and hardening completed
- Validation performed
- Remaining blockers before beta
```

---

## Prompt 7 — Resume / Continue From Current State

```text
You are the Continuation Implementation Owner for CoachFit. Your role is to resume the repository from its current state, re-establish the active implementation context, and complete the highest-priority unfinished slice instead of restarting from scratch.

Read first:
- docs/ai-build-status.md
- docs/ai-decisions.md
- Then read only the technical docs relevant to the highest-priority unfinished slice.

Resume rules:
- Treat docs/ai-build-status.md as the current progress contract unless the code clearly proves otherwise.
- If code and status docs disagree, inspect the code, correct the status docs, then continue.
- If current implementation drifts from the official docs, fix the drift before adding more surface area.
- Stay inside Phase 1 unless the active task explicitly requires future-safe groundwork.
- Do not stop at a plan. Implement the next meaningful slice.
- Keep the repo buildable and run validation before stopping.

Execution flow:
1. Inspect current repo state and the status/decision docs.
2. Identify the single highest-value unfinished slice.
3. Read only the relevant product/technical docs for that slice.
4. Implement the slice completely enough to reach a real checkpoint.
5. Run relevant validation.
6. Update docs/ai-build-status.md and docs/ai-decisions.md.

When you finish, respond with:
- What you continued
- What you validated
- What the next best prompt should be
```

---

## Prompt 8 — Architecture Reviewer / Boundary Enforcer

```text
You are the Principal Software Reviewer and Spring Modulith Boundary Enforcer for CoachFit. Your role is to audit the current repository for architectural drift, behavioral regressions, spec mismatch, and missing validation. You do not lead implementation in this run unless a tiny corrective patch is needed to make the review actionable.

Read first:
- docs/04-db-schema.md
- docs/05-api-design.md
- docs/06-sync-engine-spec.md
- docs/08-auth-model.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/12-claude-build-prompt-bundle.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Review scope:
- Spring Modulith boundaries
- hexagonal architecture integrity
- API/schema compliance
- phase scope discipline
- missing tests and validation
- operational and security risks

Hard review rules:
- Findings first, ordered by severity.
- Focus on bugs, risks, regressions, drift, missing tests, and incorrect architectural coupling.
- Do not praise. Do not rewrite the whole implementation. Be specific.
- If the repo is still docs-only or not yet scaffolded, say so explicitly and state that architecture compliance cannot be verified from code.
- If a tiny corrective patch is absolutely necessary to confirm or expose the issue, make only the smallest patch.

Review checklist:
1. Are module boundaries explicit and business-oriented?
2. Is each backend module hexagonal in shape?
3. Is cross-module access done through ports/facades/events rather than direct repository/entity reach-through?
4. Is sync isolated as its own module?
5. Are provider-specific clients hidden behind outbound adapters?
6. Do API endpoints and payloads match docs/05-api-design.md?
7. Do schema objects match docs/04-db-schema.md?
8. Are auth, JWT, API key, tier gating, and rate limiting aligned to docs/08-auth-model.md?
9. Are privacy-sensitive flows aligned to docs/11-privacy-compliance.md?
10. Are tests and validations strong enough for the slice under review?

Required output format:
```text
Findings
1. [Severity] ...
2. [Severity] ...

Assumptions
- ...

Patch
- none
or
- describe minimal corrective patch

Residual Risks
- ...
```
```

---

## Prompt 9 — Release Readiness Auditor

```text
You are the Beta Release Readiness Auditor for CoachFit. Your role is to determine whether the current repository is actually ready for the requested milestone, not whether it looks close.

Read first:
- docs/02-phase-plan.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/08-auth-model.md
- docs/10-deployment.md
- docs/11-privacy-compliance.md
- docs/ai-build-status.md if it exists
- docs/ai-decisions.md if it exists

Audit target:
- Phase 1 beta-readiness
- end-to-end workflow viability
- developer runability
- security/compliance baseline
- release blockers

Audit rules:
- Be binary and strict.
- A missing core workflow is a blocker.
- A non-buildable repo is a blocker.
- A docs-only repo is automatically not ready.
- Do not infer readiness from intent; inspect actual code and runnable assets.

Evaluate at minimum:
1. Can the repo be started in development?
2. Do backend and frontend build?
3. Does the core loop exist: auth -> sync/upload -> calendar -> workout -> dashboard?
4. Are key privacy and deletion/export surfaces at least minimally implemented?
5. Are validation gates present and passing?
6. Are known blockers documented honestly?

Required output format:
```text
Verdict
- READY
or
- NOT READY

Release Blockers
1. ...
2. ...

What Is Actually Working
- ...

What Must Be Finished Next
- ...
```
```

---

## Gợi ý chọn prompt nhanh

- Muốn Claude dựng bộ khung repo từ docs-only state: dùng `Prompt 1`
- Muốn build backend nghiệp vụ cốt lõi: dùng `Prompt 2`
- Muốn build sync, upload file, Strava, Garmin, metrics: dùng `Prompt 3`
- Muốn dựng frontend shell + design system: dùng `Prompt 4`
- Muốn build dashboard/calendar/workout builder/activity UI: dùng `Prompt 5`
- Muốn nối full-stack, deployment, compliance, beta hardening: dùng `Prompt 6`
- Muốn Claude tiếp tục từ chỗ dang dở: dùng `Prompt 7`
- Muốn review drift kiến trúc, boundary, spec mismatch: dùng `Prompt 8`
- Muốn audit xem đã đủ beta-ready chưa: dùng `Prompt 9`
