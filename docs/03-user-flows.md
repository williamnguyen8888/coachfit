# User Flows — CoachFit

## 1. Đăng Ký & Onboarding

```mermaid
flowchart TD
    A["Landing Page"] --> B{"Đăng ký"}
    B -->|Email| C["Tạo account (email + password)"]
    B -->|Google| D["OAuth Google"]
    B -->|Strava| E["OAuth Strava → auto connect sync"]
    C --> F["Onboarding Wizard"]
    D --> F
    E --> F
    F --> G["Bước 1: Chọn môn thể thao"]
    G --> H["Bước 2: Kinh nghiệm bao lâu?"]
    H --> I["Bước 3: Kết nối Strava/Garmin"]
    I --> J["Import data tự động"]
    J --> K["Dashboard với data thật"]
```

**Ghi chú:** Nếu đăng ký qua Strava, bước 3 auto-skip. Data import chạy background, dashboard hiện ngay dù data chưa import xong (loading state).

---

## 2. Strava Webhook Sync

```mermaid
flowchart TD
    A["Strava: athlete tạo activity"] --> B["POST /api/v1/webhooks/strava"]
    B --> C{"Validate subscription_id"}
    C -->|Invalid| D["Return 200, log warning"]
    C -->|Valid| E["Push job to Redis queue"]
    E --> F["Return 200 immediately"]
    F --> G["Worker pick job"]
    G --> H["Load user tokens"]
    H --> I{"Token expired?"}
    I -->|Yes| J["Refresh token"]
    I -->|No| K["GET Strava activity + streams"]
    J --> K
    K --> L{"Check duplicate"}
    L -->|Duplicate| M["Skip / Update existing"]
    L -->|New| N["Parse → Normalize"]
    N --> O["Calculate TSS/NP/IF"]
    O --> P["Store activity + streams + laps"]
    P --> Q["Recalculate CTL/ATL/TSB"]
    Q --> R["Log sync result"]
```

**Ghi chú:** Strava yêu cầu respond 200 trong <2 giây. Mọi xử lý nặng đều qua Redis queue.

---

## 3. Upload FIT File

```mermaid
flowchart TD
    A["User chọn file .FIT/.TCX/.GPX"] --> B["POST /api/v1/activities/upload"]
    B --> C["Store raw file → MinIO"]
    C --> D{"Detect format"}
    D -->|FIT| E["Parse: Garmin FIT SDK"]
    D -->|TCX| F["Parse: XML/JAXB"]
    D -->|GPX| G["Parse: XML"]
    E --> H["Extract: GPS, HR, Power, Cadence, Laps"]
    F --> H
    G --> H
    H --> I{"Check duplicate (fingerprint)"}
    I -->|Duplicate| J["Return 409: đã tồn tại"]
    I -->|New| K["Normalize to internal model"]
    K --> L["Calculate metrics (TSS/NP/IF)"]
    L --> M["Store activity + streams + laps"]
    M --> N["Recalculate training load"]
    N --> O["Return 201 + activity detail"]
```

---

## 4. Tạo Workout

```mermaid
flowchart TD
    A["Workout Builder page"] --> B["Chọn sport type"]
    B --> C["Thêm blocks: warmup → intervals → cooldown"]
    C --> D["Set target per block (power/HR/pace + duration)"]
    D --> E["Preview workout profile"]
    E --> F{"Action?"}
    F -->|Save| G["POST /api/v1/workouts → lưu library"]
    F -->|Schedule| H["POST /api/v1/calendar → đặt vào ngày"]
    F -->|Export| I["GET /api/v1/workouts/{id}/export/fit → download .FIT"]
    F -->|Share| J["Generate shareable link"]
```

**Ghi chú:** Workout builder dùng drag-and-drop blocks. KHÔNG dùng text syntax như Intervals.icu. Preview hiện bar chart với màu theo zone.

---

## 5. Daily Workflow

```mermaid
flowchart TD
    A["☀️ Sáng: mở app"] --> B["Dashboard: Morning Briefing"]
    B --> C["Xem workout hôm nay"]
    C --> D["Check-in: mood 😊 / sleep 💤 / fatigue 😫"]
    D --> E["🏃 Đi tập"]
    E --> F["Activity auto-sync từ Garmin → Strava → CoachFit"]
    F --> G["📊 Sau tập: xem activity detail"]
    G --> H["Review: metrics + plan compliance"]
    H --> I["🌙 Tối: xem workout ngày mai"]
    I --> J["Xem tiến độ tuần (bar chart)"]
```

**Ghi chú:** Đây là workflow chính. Dashboard phải load trong <2 giây. Morning briefing = touchpoint quan trọng nhất.

---

## 6. Subscription Upgrade

```mermaid
flowchart TD
    A["User click feature Premium 🔒"] --> B["Modal: Nâng cấp tài khoản"]
    B --> C["So sánh: Free vs Pro vs Elite"]
    C --> D["Chọn tier + billing (monthly/annual)"]
    D --> E["POST /api/v1/subscription/checkout"]
    E --> F["Redirect → Stripe Checkout"]
    F --> G["Thanh toán thành công"]
    G --> H["Stripe webhook → update subscription"]
    H --> I["Feature flags updated"]
    I --> J["Feature unlocked ✅"]
```

**Ghi chú:** Trước khi có Stripe (Phase 1), chỉ hiện "Coming soon — hiện tại tất cả FREE". Stripe integrate ở Phase 2.

---

## 7. API Usage (Developer)

```mermaid
flowchart TD
    A["Developer đăng ký CoachFit"] --> B["Settings → Developer → API Keys"]
    B --> C["Generate API key (cf_live_xxx...)"]
    C --> D["Copy key — chỉ hiện 1 lần"]
    D --> E["Đọc Swagger docs (/api/docs)"]
    E --> F["Call API: Authorization: Bearer cf_live_xxx"]
    F --> G{"Rate limit check (Redis)"}
    G -->|OK| H["200 + data + rate limit headers"]
    G -->|Exceeded| I["429 Too Many Requests + retry-after"]
```

**Ghi chú:** API key khác JWT token. API key dùng cho external access (automation, integration). JWT dùng cho browser session.

---

## Coach Flows

### Flow: Coach Invite Athlete (Email)

```mermaid
sequenceDiagram
    participant C as Coach
    participant S as Server
    participant E as Email
    participant A as Athlete
    
    C->>S: POST /coach/athletes/invite {email}
    S->>S: Create coach_athletes (pending)
    S->>S: Generate invite token (JWT 7d)
    S->>E: Send invite email
    E->>A: "Coach Minh mời bạn"
    A->>S: GET /coach/invites/{token}/accept
    S->>S: Validate token + set status='active'
    S->>A: Redirect to dashboard
    S->>C: Notification: Athlete accepted
```

### Flow: Coach Invite Athlete (Link)

```mermaid
sequenceDiagram
    participant C as Coach
    participant S as Server
    participant A as Athlete
    
    C->>S: POST /coach/invite-link {reusable: true}
    S->>C: {code: "abc123", url: "coachfit.app/join/abc123"}
    C->>A: Share link (chat, email, etc.)
    A->>S: GET /join/{code}
    S->>S: Validate code + create relationship
    S->>A: Redirect to dashboard
```

### Flow: Coach Assign Workout

```mermaid
sequenceDiagram
    participant C as Coach
    participant S as Server
    participant A as Athlete
    
    C->>S: GET /coach/athletes (roster)
    S->>C: List athletes + fitness status
    C->>S: POST /coach/athletes/{id}/calendar {workoutId, date}
    S->>S: Create calendar_event (assigned_by=coach)
    S->>A: Notification: "Coach assigned Tempo Intervals"
    A->>S: Complete workout
    S->>S: Calculate compliance_score
    S->>C: Notification: "Minh completed, compliance 92%"
```

### Flow: Coach View Athlete Data

```mermaid
sequenceDiagram
    participant C as Coach
    participant S as Server
    
    C->>S: GET /coach/athletes/{id}/dashboard
    S->>S: Check permissions
    S->>C: Athlete overview (activities, wellness, PMC, health)
    C->>S: GET /coach/athletes/{id}/activities
    S->>C: Paginated activities
    C->>S: POST /coach/athletes/{id}/activities/{actId}/comments
    S->>S: Create comment (coach → athlete)
```

### Flow: Athlete Manage Coach Access

```mermaid
sequenceDiagram
    participant A as Athlete
    participant S as Server
    
    A->>S: GET /athlete/coach (current coach info)
    S->>A: Coach name, permissions, since date
    A->>S: PUT /athlete/coach/permissions {readWellness: false}
    S->>S: Update permissions JSONB
    A->>S: DELETE /athlete/coach
    S->>S: Set status='revoked', revoked_at=now()
    S->>A: Coach access removed
```
