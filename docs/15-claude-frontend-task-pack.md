# Claude Frontend Task Pack — CoachFit

Tài liệu này là pack prompt chỉ dành cho frontend. Mỗi prompt là một ticket nhỏ để bạn giao cho AI như giao việc cho một frontend engineer.

## Mục tiêu

- Build frontend theo đúng docs
- Đi từng bước nhỏ để dễ kiểm soát
- Tách rõ từng feature UI thay vì giao cả app một lúc

## Luật dùng pack này

- Chỉ giao `1 prompt` mỗi lần
- Chỉ sang prompt tiếp theo khi prompt trước đạt
- Nếu kết quả chưa ổn, sửa ngay ở prompt đó
- Không gộp nhiều task vào một prompt
- Mọi task phải bám:
  - `docs/01-prd.md`
  - `docs/02-phase-plan.md`
  - `docs/03-user-flows.md`
  - `docs/05-api-design.md`
  - `docs/07-workout-data-model.md`
  - `docs/09-design-system.md`
  - `docs/10-deployment.md`

## Prerequisite

Trước khi chạy frontend pack, nên có tối thiểu:
- backend scaffold
- frontend scaffold
- auth backend APIs

Ít nhất backend side nên hoàn thành tới:
- `B01`
- `B02`
- `B05`

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

1. F01
2. F02
3. F03
4. F04
5. F05
6. F06
7. F07
8. F08
9. F09
10. F10
11. F11
12. F12
13. F13
14. F14
15. F15
16. F16

---

## F01 — Frontend Scaffold And App Shell

```text
You are the Frontend Foundation Engineer for CoachFit. This ticket is only for frontend scaffold, app shell, and project structure.

Read first:
- docs/02-phase-plan.md
- docs/09-design-system.md
- docs/10-deployment.md

Task:
- Scaffold Next.js 15 + TypeScript + Tailwind
- Create:
  - src/app
  - src/components/ui
  - src/components/layout
  - src/components/charts
  - src/components/calendar
  - src/components/workout
  - src/lib
  - src/hooks
  - src/stores
  - src/styles
- Add app shell:
  - desktop sidebar
  - mobile bottom tab bar

Constraints:
- No deep feature pages yet
- No generic admin template look

Done when:
- Frontend builds
- App shell renders
```

---

## F02 — Design Tokens And UI Primitives

```text
You are the Frontend Design System Engineer for CoachFit. This ticket is only for design tokens and reusable UI primitives.

Read first:
- docs/09-design-system.md

Task:
- Add global CSS tokens
- Wire tokens into Tailwind
- Set dark mode as default
- Add:
  - Button
  - Card
  - Input
  - Skeleton
- Add typography and spacing foundation

Constraints:
- No hardcoded hex values inside components
- Keep visuals aligned exactly to docs

Done when:
- Tokens are wired
- Core primitives exist
```

---

## F03 — API Client, Auth Store, Route Protection

```text
You are the Frontend Platform Engineer for CoachFit. This ticket is only for API client, auth state, and route protection foundation.

Read first:
- docs/05-api-design.md
- docs/08-auth-model.md
- docs/10-deployment.md

Task:
- Create API client wrapper
- Create auth state/store
- Handle JWT/refresh flow on the client appropriately
- Add route protection approach for authenticated pages
- Add shared loading and error handling base patterns

Constraints:
- Do not build feature pages here
- Keep auth handling aligned to backend model

Done when:
- Auth-aware app foundation exists
```

---

## F04 — Login And Register

```text
You are the Frontend Auth Engineer for CoachFit. This ticket is only for login and register screens.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build login page
- Build register page
- Add Google login entry point
- Add Strava login/connect entry point where appropriate per docs
- Wire both to real backend auth APIs
- Add validation, loading, and error states

Constraints:
- Scope only login/register
- Do not build onboarding or dashboard here

Done when:
- Users can log in and register through the UI
```

---

## F05 — Onboarding

```text
You are the Frontend Onboarding Engineer for CoachFit. This ticket is only for the onboarding flow shell.

Read first:
- docs/01-prd.md
- docs/03-user-flows.md
- docs/09-design-system.md

Task:
- Build onboarding flow with 3 steps:
  - sports selection
  - experience level
  - connect device/platform step
- Wire the connect device/platform step to real Strava/Garmin connect entry points when backend APIs exist
- Show loading and partial-progress states for onboarding import/connect scenarios

Constraints:
- Do not build dashboard here
- Keep this flow lightweight and mobile-friendly

Done when:
- Onboarding shell exists and is usable
```

---

## F06 — Activities List

```text
You are the Frontend Activities List Engineer for CoachFit. This ticket is only for the activities list page.

Read first:
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build activity list page
- Add filters
- Add pagination UI
- Add source badges
- Add loading, empty, and error states

Constraints:
- List page only
- Do not build activity detail here

Done when:
- Activity list works against backend APIs
```

---

## F07 — Activity Detail

```text
You are the Frontend Activity Detail Engineer for CoachFit. This ticket is only for the activity detail experience.

Read first:
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build activity detail page
- Add:
  - map
  - charts
  - laps summary
  - metrics section
  - source info

Constraints:
- Detail page only
- Keep mobile and desktop usable

Done when:
- Activity detail works against backend APIs
```

---

## F08 — Workout Library

```text
You are the Frontend Workout Library Engineer for CoachFit. This ticket is only for workout library screens.

Read first:
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build workout list page
- Build workout detail page
- Show templates and user workouts
- Wire create/edit/delete entry points cleanly

Constraints:
- No visual builder yet
- Keep this slice limited to library browsing/management

Done when:
- Workout library surfaces work
```

---

## F09 — Workout Builder

```text
You are the Frontend Workout Builder Engineer for CoachFit. This ticket is only for the visual workout builder.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/07-workout-data-model.md
- docs/09-design-system.md

Task:
- Build visual workout builder
- Support:
  - warmup
  - work
  - rest
  - cooldown
  - repeat
- Support duration and target editing
- Add preview visualization
- Wire save action
- Wire schedule-to-calendar action
- Wire FIT export action

Constraints:
- No text syntax builder
- Max repeat nesting depth = 1

Done when:
- Users can build valid structured workouts visually
```

---

## F10 — Calendar Views

```text
You are the Frontend Calendar Engineer for CoachFit. This ticket is only for core calendar views.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build week view
- Build month view
- Show planned vs completed distinction
- Support add/edit/delete entry points
- Add swipe-friendly week navigation expectations for mobile use

Constraints:
- No drag and drop yet
- Calendar views only

Done when:
- Calendar views work against backend APIs
```

---

## F11 — Calendar Interactions

```text
You are the Frontend Calendar Interaction Engineer for CoachFit. This ticket is only for drag-and-drop, reorder, complete/skip, and mobile usability.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Add drag-and-drop
- Add same-day reorder UI
- Add complete/skip actions
- Improve mobile calendar usability
- Preserve responsive touch targets and swipe behavior from the design system docs

Constraints:
- Interactions only
- Do not redesign the whole calendar structure

Done when:
- Calendar interaction flows are usable on desktop and mobile
```

---

## F12 — Dashboard

```text
You are the Frontend Dashboard Engineer for CoachFit. This ticket is only for the dashboard page.

Read first:
- docs/01-prd.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build dashboard page
- Add:
  - morning briefing
  - today workout
  - health snapshot
  - weekly summary
  - fitness trend
  - recent activities
- Use skeleton loading states and make the mobile composition intentional, not a desktop layout simply collapsed down

Constraints:
- Dashboard only
- Keep it data-rich but calm

Done when:
- Dashboard works against backend APIs
```

---

## F13 — Wellness Check-In

```text
You are the Frontend Wellness Engineer for CoachFit. This ticket is only for the wellness check-in experience.

Read first:
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build wellness check-in UI
- Support mood, RPE, fatigue-related inputs according to docs
- Show last known state where appropriate

Constraints:
- Do not expand into full analytics here

Done when:
- Wellness check-in works against backend APIs
```

---

## F14 — Settings

```text
You are the Frontend Settings Engineer for CoachFit. This ticket is only for settings surfaces.

Read first:
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build settings page sections for:
  - athlete profile
  - sport zones
  - connected accounts
  - API keys
  - subscription placeholder
- Add connected account connect/disconnect UI for Strava and Garmin when backend surfaces exist
- Keep room for Google identity/account display where relevant

Constraints:
- Scope only settings
- Keep forms and layout aligned to design system

Done when:
- Settings surfaces work against backend APIs
```

---

## F15 — PWA And Responsive Polish

```text
You are the Frontend Platform Polish Engineer for CoachFit. This ticket is only for PWA shell and responsive polish.

Read first:
- docs/02-phase-plan.md
- docs/09-design-system.md
- docs/10-deployment.md

Task:
- Add manifest.json if missing
- Add service worker baseline if frontend-owned
- Improve responsive polish across key pages
- Verify dark mode and mobile navigation quality

Constraints:
- No new product features
- Only polish and PWA baseline

Done when:
- PWA shell exists
- Main pages behave well on mobile
```

---

## F16 — Frontend Review And Audit

```text
You are the Frontend Reviewer for CoachFit. This ticket is only for frontend review and milestone audit.

Read first:
- docs/02-phase-plan.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Review the current frontend for:
  - spec drift
  - missing states
  - responsiveness issues
  - design system drift
  - integration gaps
- Audit whether frontend is actually ready for the intended milestone

Required output:
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

Chỉ chạy sau khi Phase 1 MVP ổn định.

### F17 — Analytics UI

```text
You are the Frontend Analytics Engineer for CoachFit. This ticket is only for analytics UI in Phase 2.

Read first:
- docs/02-phase-plan.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build PMC chart UI
- Build power curve UI
- Build zone distribution UI
```

### F18 — Coach UI

```text
You are the Frontend Coach Product Engineer for CoachFit. This ticket is only for Phase 2 coach UI.

Read first:
- docs/02-phase-plan.md
- docs/03-user-flows.md
- docs/05-api-design.md
- docs/09-design-system.md

Task:
- Build coach dashboard
- Build roster panel
- Build athlete detail panel
- Build coach assignment, comments, and notifications UI
```
