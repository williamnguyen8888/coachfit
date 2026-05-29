# PRD — CoachFit

## Tổng Quan

Nền tảng quản lý tập luyện cho vận động viên sức bền (triathlon, cycling, running). Web-first, API-first. Cạnh tranh với Intervals.icu (UX tốt hơn) và TrainingPeaks (rẻ hơn).

- **Target user:** Self-coached endurance athlete, 2-5 năm kinh nghiệm
- **Platform:** Web (Next.js) + PWA, Backend API (Java Spring Boot)
- **Monetization:** Free ban đầu, thiết kế sẵn sàng thu phí bất cứ lúc nào

## Nguyên Tắc Sản Phẩm

1. **Athlete-centric** — mọi tính năng phải giúp athlete tập tốt hơn
2. **Progressive disclosure** — đơn giản mặc định, phức tạp khi cần
3. **API-first** — mọi feature đều có API, UI chỉ là 1 client
4. **AI-ready** — kiến trúc sẵn sàng cho AI, nhưng AI chưa phải ưu tiên
5. **Monetization-ready** — feature flags + subscription tiers từ ngày đầu
6. **Ship fast** — done > perfect

---

## Phase 1 — MVP: "Lịch Tập Thông Minh" (Tháng 1-4)

### 1.1 Đăng Ký & Onboarding

| | |
|---|---|
| **Mô tả** | Đăng ký tài khoản + wizard hướng dẫn ban đầu |
| **User story** | Là athlete, tôi muốn đăng ký nhanh và được hướng dẫn setup ban đầu, để bắt đầu dùng ngay |
| **Tier** | 🆓 Free |

**Acceptance criteria:**
- [ ] Đăng ký email/password
- [ ] Đăng nhập OAuth Google
- [ ] Đăng nhập OAuth Strava (auto-connect sync)
- [ ] Onboarding wizard: chọn môn → kinh nghiệm → kết nối thiết bị
- [ ] Import data từ Strava sau khi connect
- [ ] Redirect đến dashboard với data thật

### 1.2 Sync Engine — Activities

| | |
|---|---|
| **Mô tả** | Đồng bộ activities từ nhiều nguồn: Strava, Garmin, COROS, ROUVY, file upload |
| **User story** | Là athlete, tôi muốn activities tự động xuất hiện sau khi tập xong dù tôi dùng thiết bị/app nào |
| **Tier** | 🆓 Free (2 sources) / 💎 Premium (unlimited) |

**Sync sources & strategy:**

| Source | Cách sync | Health data? | Phase |
|---|---|---|---|
| **Strava** | OAuth + webhook (push) | ❌ Activities only | Phase 1 |
| **Garmin** | Garmin Health API (push) | ✅ Full health data | Phase 1 |
| **COROS** | Via Strava bridge + FIT upload | ❌ Activities only | Phase 1 |
| **ROUVY** | Via Strava bridge + FIT upload | ❌ Activities only | Phase 1 |
| **Wahoo** | Via Strava bridge + FIT upload | ❌ Activities only | Phase 2 |
| **Polar** | Polar Accesslink API (Phase 2+) | ✅ Partial | Phase 2 |
| **File upload** | FIT/TCX/GPX manual | ❌ | Phase 1 |

**Acceptance criteria:**
- [ ] Strava OAuth connect/disconnect + webhook auto-sync
- [ ] Garmin Health API integration (OAuth 1.0a, push-based callbacks)
- [ ] Upload FIT/TCX/GPX file thủ công
- [ ] Deduplication: source-based + cross-source fingerprint
- [ ] Sync status dashboard (per provider: last sync, pending, errors)
- [ ] Raw file lưu vào MinIO
- [ ] Parse → normalize → calculate metrics → store
- [ ] COROS/ROUVY activities tự động qua Strava bridge

### 1.3 Sync Engine — Health & Wellness Data (từ Garmin)

| | |
|---|---|
| **Mô tả** | Đồng bộ dữ liệu sức khỏe hàng ngày từ Garmin watch: HR nghỉ, bước chân, giấc ngủ, HRV, stress... |
| **User story** | Là athlete, tôi muốn thấy dữ liệu sức khỏe từ đồng hồ tự động hiện trên dashboard, để theo dõi recovery |
| **Tier** | 🆓 Free |

**Garmin Health API push data:**

| Data type | Dữ liệu | Tần suất push |
|---|---|---|
| **Dailies** | Steps, distance, calories, active minutes, floors, resting HR, avg stress | Sau midnight sync |
| **Sleep** | Thời lượng, stages (deep/light/REM/awake), sleep score, respiration | Sáng sớm |
| **HRV** | Nightly rMSSD, HRV status, baseline, weekly avg | Hàng ngày |
| **Body Battery** | Charged/drained, min/max throughout day | Hàng ngày |
| **Stress** | Avg/max/min stress level, duration by level | Hàng ngày |
| **Respiration** | Avg respiration rate (day/sleep) | Hàng ngày |
| **Pulse Ox** | SpO2 readings (day/sleep) | Hàng ngày |
| **Body Composition** | Weight, BMI, body fat % (từ Garmin scale) | Khi đo |
| **User Metrics** | VO2max estimate, training status | Periodic |

**Acceptance criteria:**
- [ ] Nhận push data từ Garmin Health API (registered callbacks)
- [ ] Parse & store daily health summaries
- [ ] Hiển thị trên dashboard: resting HR, sleep, HRV, steps, body battery, stress
- [ ] Health trend charts (7/30/90 ngày)
- [ ] Auto-fill wellness log từ Garmin data (thay vì nhập tay)
- [ ] Fallback: user vẫn nhập tay nếu không connect Garmin

### 1.4 Activities

| | |
|---|---|
| **Mô tả** | Xem danh sách và chi tiết activities |
| **User story** | Là athlete, tôi muốn xem chi tiết từng buổi tập với charts và metrics, để đánh giá chất lượng tập |
| **Tier** | 🆓 Free (30 ngày) / 💎 Premium (full history) |

**Acceptance criteria:**
- [ ] Danh sách activities (paginated, filter by sport/date/source)
- [ ] Chi tiết: map GPS, charts (HR, power, pace, cadence, altitude)
- [ ] Lap/interval summary table
- [ ] Metrics: distance, duration, avg HR, avg power, TSS, NP, IF
- [ ] Edit name, description, gear
- [ ] Delete activity
- [ ] Download original file
- [ ] Badge hiện source (Strava/Garmin/COROS/ROUVY/File)

### 1.5 Training Calendar

| | |
|---|---|
| **Mô tả** | Lịch tập hàng tuần/tháng, plan vs actual |
| **User story** | Là athlete, tôi muốn thấy lịch tập planned vs completed rõ ràng, để biết mình có on track không |
| **Tier** | 🆓 Free |

**Acceptance criteria:**
- [ ] Week view (mặc định) + month view
- [ ] Hiển thị planned workouts + completed activities
- [ ] Visual distinction: planned (outline) vs completed (filled)
- [ ] Drag-and-drop để di chuyển/sắp xếp
- [ ] Click ngày → add workout/note/rest
- [ ] Mark as completed/skipped
- [ ] Mobile responsive (swipe between weeks)

### 1.6 Workout Builder

| | |
|---|---|
| **Mô tả** | Tạo structured workout bằng visual drag-and-drop |
| **User story** | Là athlete, tôi muốn tạo workout có intervals rõ ràng và export ra Garmin, để tập đúng kế hoạch |
| **Tier** | 🆓 Free (templates) / 💎 Premium (full builder) |

**Acceptance criteria:**
- [ ] Visual block builder (drag-and-drop)
- [ ] Step types: warmup, work, rest, cooldown, repeat
- [ ] Targets: power/HR/pace zones, % FTP, absolute values
- [ ] Duration: time, distance
- [ ] Cadence target (optional)
- [ ] Preview visualization (bar chart dạng workout profile)
- [ ] Save to library
- [ ] Schedule to calendar
- [ ] Export .FIT file (download)
- [ ] System templates library (pre-built workouts)

### 1.7 Dashboard

| | |
|---|---|
| **Mô tả** | Trang chính — morning briefing + sức khỏe + tóm tắt tuần |
| **User story** | Là athlete, tôi muốn mở app và biết ngay hôm nay tập gì + tình trạng sức khỏe, trong 10 giây |
| **Tier** | 🆓 Free (basic) / 💎 Premium (customizable) |

**Acceptance criteria:**
- [ ] Workout hôm nay (từ calendar)
- [ ] **Health snapshot từ Garmin**: resting HR, sleep score, HRV, body battery, stress
- [ ] Weekly volume summary (bar chart: planned vs actual)
- [ ] Fitness trend đơn giản (CTL sparkline)
- [ ] Recent activities feed (3-5 gần nhất)
- [ ] Daily wellness: auto-fill từ Garmin + manual check-in (mood, RPE)
- [ ] Quick stats: tổng km tuần, tổng giờ tuần, TSS tuần
- [ ] Steps hôm nay (từ Garmin)

### 1.8 Public API

| | |
|---|---|
| **Mô tả** | REST API cho developer/automation |
| **User story** | Là developer, tôi muốn truy cập data qua API để build integration/automation |
| **Tier** | 🆓 Free (500 req/day) / 💎 Premium (5000/day) |

**Acceptance criteria:**
- [ ] REST JSON API tất cả resources
- [ ] API key authentication
- [ ] Rate limiting per tier (Redis counter)
- [ ] Swagger/OpenAPI documentation
- [ ] Rate limit headers trong response

### 1.9 Settings & Profile

| | |
|---|---|
| **Mô tả** | Quản lý profile, zones, connections |
| **Tier** | 🆓 Free |

**Acceptance criteria:**
- [ ] Athlete profile: sports, weight, gender
- [ ] Sport zones config: power/HR/pace zones per sport
- [ ] FTP, LTHR, max HR settings per sport
- [ ] Connected accounts: list, connect, disconnect
- [ ] API keys: generate, revoke
- [ ] Subscription status (placeholder for future payment)

---

## Phase 2 — "Phân Tích & Coach" (Tháng 5-9)

### Analytics (Pro tier)

| Feature | Tier | Mô tả |
|---|---|---|
| PMC Chart | 💎 Pro | Biểu đồ CTL/ATL/TSB (Fitness/Fatigue/Form) per sport |
| Power/Pace Curve | 💎 Pro | Power duration curve, peak analysis |
| Zone Distribution | 💎 Pro | Time in zones per activity/period |
| Season Comparison | 💎 Pro | So sánh giai đoạn tập luyện |
| Health Trends | 🆓 Free | HR/sleep/HRV/stress trends dài hạn |
| Training Plan Templates | 🆓/💎 | Free dùng, Premium tạo |
| Activity Comments | 🆓 Free | Comment trên activities |
| Shareable Links | 🆓 Free | Share workout/plan qua link |

### Coach System (Coach tier)

#### 2.1 Coach Dashboard

| | |
|---|---|
| **Mô tả** | Trang quản lý tất cả athletes của coach |
| **User story** | Là coach, tôi muốn thấy toàn bộ athletes trên 1 màn hình, biết ai cần chú ý, ai đang progress tốt |
| **Tier** | 🏷️ Coach |

**Acceptance criteria:**
- [ ] Athlete roster: list + search + filter by tags
- [ ] Mỗi athlete card: name, avatar, CTL/ATL/TSB, status indicator (🟢/🟡/🔴)
- [ ] Status: Fresh (TSB>5), Optimal (-5≤TSB≤5), Fatigued (TSB<-5)
- [ ] Click athlete → expanded detail panel (calendar, activities, PMC, health)
- [ ] Alert feed: missed workouts, overtraining risk, poor sleep, elevated HR
- [ ] Athlete tags: coach tự gán tags (để group/filter)
- [ ] Athlete nickname: coach đặt tên riêng
- [ ] Coach notes: private notes về từng athlete
- [ ] Overview stats: tổng athletes, avg compliance, athletes at risk

#### 2.2 Coach — Invite & Roster Management

| | |
|---|---|
| **Mô tả** | Mời và quản lý danh sách athletes |
| **User story** | Là coach, tôi muốn mời athlete bằng email hoặc link, và athlete có thể chấp nhận/từ chối |
| **Tier** | 🏷️ Coach |

**Acceptance criteria:**
- [ ] Invite by email: nhập email → gửi invite → athlete accept
- [ ] Invite by shareable link: tạo link (1-time hoặc reusable) → share → athlete mở link → auto-join
- [ ] Invite link settings: reusable/1-time, max uses, expiry date
- [ ] Pending invites list: xem ai chưa accept
- [ ] Remove athlete: coach revoke bất cứ lúc nào
- [ ] Athlete revoke: athlete tự rời bất cứ lúc nào
- [ ] Athlete permission control: athlete chọn coach được xem gì

#### 2.3 Coach — Workout Assignment

| | |
|---|---|
| **Mô tả** | Giao workout và training plan cho athletes |
| **User story** | Là coach, tôi muốn giao workout cho athlete, theo dõi họ hoàn thành hay không |
| **Tier** | 🏷️ Coach |

**Acceptance criteria:**
- [ ] Assign workout: chọn workout → chọn athlete → chọn ngày → giao
- [ ] Bulk assign: giao cùng 1 workout cho nhiều athletes
- [ ] Calendar write: coach viết trực tiếp lên calendar của athlete
- [ ] Workout library share: coach share workout templates với athletes
- [ ] Compliance tracking: xem athlete hoàn thành bao nhiêu %
- [ ] Notification: athlete nhận thông báo khi được giao workout
- [ ] Coach nhận thông báo khi athlete hoàn thành/bỏ workout

#### 2.4 Coach — Athlete Analytics

| | |
|---|---|
| **Mô tả** | Xem dữ liệu tập luyện, sức khỏe, PMC của athlete |
| **User story** | Là coach, tôi muốn xem detail activities, PMC chart, health data của athlete để đưa ra kế hoạch phù hợp |
| **Tier** | 🏷️ Coach |

**Acceptance criteria:**
- [ ] View athlete activities (paginated, filter)
- [ ] View activity detail + streams (HR, power, pace)
- [ ] View athlete PMC chart (CTL/ATL/TSB per sport)
- [ ] View athlete wellness history
- [ ] View athlete health data (sleep, HRV, resting HR trends)
- [ ] View athlete sport zones
- [ ] Comment trên activities (coach ↔ athlete)
- [ ] Alerts: auto-detect vấn đề (overtraining, missed workouts, poor recovery)

#### 2.5 Notifications System

| | |
|---|---|
| **Mô tả** | Hệ thống thông báo cho cả athlete và coach |
| **User story** | Là user, tôi muốn nhận thông báo về các sự kiện quan trọng mà không cần mở app liên tục |
| **Tier** | 🆓 Free |

**Acceptance criteria:**
- [ ] Notification bell (unread count badge)
- [ ] Types: coach_invite, workout_assigned, workout_completed, comment_added, alert_overtraining, alert_missed_workout
- [ ] Mark read / mark all read
- [ ] Click notification → navigate to relevant page
- [ ] Phase 3+: push notification (web/mobile)

### Platform

| Feature | Tier | Mô tả |
|---|---|---|
| Polar Sync | 🆓 Free | Polar Accesslink API (activities + health) |
| Wahoo Sync | 🆓 Free | Via Strava bridge |
| Stripe Payment | Platform | Thu phí subscription |

## Phase 3 — "Intelligence & Ecosystem" (Tháng 10-18)

| Feature | Tier |
|---|---|
| AI Weekly Summary | 💎 Elite |
| AI Rest Day Suggestion | 💎 Elite |
| Auto FTP/LTHR Detection | 💎 Pro |
| Coach Marketplace | Commission |
| Team/Club Dashboard | Team tier |

## Phase 4 — "Scale" (Tháng 18+)

| Feature | Tier |
|---|---|
| AI Workout Generation | 💎 Elite |
| AI Recovery Analysis | 💎 Elite |
| Native Mobile App (iOS → Android) | All |
| White-label | Enterprise |
| Zwift Direct Sync | 🆓 Free |
| COROS Direct Partnership (nếu có API) | 🆓 Free |

---

## Monetization Model

| Tier | Giá | Tính năng chính |
|---|---|---|
| **Free** | $0 | Calendar, sync (2 sources), templates, 30-day analytics, API 500/day |
| **Pro** | $9/tháng | Full sync, full builder, full history, PMC, power curve, API 5K/day |
| **Elite** | $19/tháng | All Pro + AI features, custom dashboard, bulk export |
| **Coach** | $29/tháng | All Pro + multi-athlete management, assignments, athlete analytics, bulk actions, team overview, comments, notifications, invite system |

> **Coach IS-A Athlete:** Coach tier bao gồm tất cả tính năng Pro cho chính coach + quản lý athletes. Coach vẫn tập luyện và track data của mình.

**Implementation:** Feature flags table trong DB. Mỗi API endpoint annotate `@RequiresTier("pro")`. Check trên mọi request.
