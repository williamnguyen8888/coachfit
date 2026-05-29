# Auth & Permission Model — CoachFit

## Authentication Methods

### 1. Email/Password
- Đăng ký: email + password → hash (BCrypt, strength 12) → store
- Đăng nhập: email + password → verify → JWT
- Password: min 8 ký tự
- Email verification: Phase 2 (skip MVP, auto-verify)

### 2. OAuth Providers

#### Strava OAuth
| | |
|---|---|
| Flow | Authorization Code Grant |
| Auth URL | `https://www.strava.com/oauth/authorize` |
| Token URL | `https://www.strava.com/oauth/token` |
| Scopes | `activity:read_all, profile:read_all` |

- Dùng cho cả đăng nhập lẫn kết nối sync
- Nếu email chưa tồn tại → tạo account mới (auto-register)
- Nếu email đã có → link Strava vào account hiện tại
- Tokens lưu encrypted (AES-256) trong `oauth_connections`
- Auto-refresh khi expired

#### Google OAuth
| | |
|---|---|
| Flow | Authorization Code (OIDC) |
| Scopes | `openid, email, profile` |

- Chỉ dùng cho đăng nhập/đăng ký, không sync data

#### Garmin OAuth (Phase 1)
| | |
|---|---|
| Flow | OAuth 1.0a (3-legged) |
| Request Token | `POST /oauth-service/oauth/request_token` |
| Auth URL | `https://connect.garmin.com/oauthConfirm` |
| Access Token | `POST /oauth-service/oauth/access_token` |

- Dùng cho kết nối Garmin Health API (push-based sync)
- OAuth 1.0a tokens không expire — lưu access_token + access_token_secret
- Store encrypted trong `oauth_connections`
- Push data: activities + health (sleep, HR, HRV, stress, steps, body battery)

### 3. API Key Authentication
- User tạo API key trong Settings
- Format: `cf_live_` + 32 chars random hex
- Store: `SHA-256(key)` trong DB
- Full key chỉ hiện **1 lần** khi tạo
- Auth header: `Authorization: Bearer cf_live_xxxxxxxx...`
- Rate limit per key dựa trên subscription tier

---

## JWT Structure

```json
{
  "sub": "user-uuid",
  "email": "minh@example.com",
  "role": "athlete",
  "tier": "free",
  "iat": 1234567890,
  "exp": 1234567890
}
```

| Token | Expiry | Storage |
|---|---|---|
| Access token | 1 hour | Frontend memory (không localStorage) |
| Refresh token | 30 days | httpOnly, secure cookie |

> **Tier change handling:**
> 1. Khi tier thay đổi (upgrade/downgrade), server thêm user vào Redis blacklist: `tier_changed:{userId}` (TTL = 1 giờ)
> 2. `FeatureGateFilter` check Redis blacklist TRƯỚC khi check JWT tier
> 3. Nếu user trong blacklist → force re-authentication (401 với code `TIER_CHANGED`)
> 4. Client nhận 401 `TIER_CHANGED` → auto-refresh token → JWT mới có tier đúng
> 5. Sau khi refresh thành công → xóa user khỏi blacklist
> 6. **Kết quả:** Tier change có hiệu lực trong vòng vài giây, không phải 1 giờ
>
> ```
> Redis key:  tier_changed:{userId}
> Value:      {oldTier: "pro", newTier: "free", changedAt: "..."}
> TTL:        3600 (cleanup nếu client không re-auth)
> ```

### Spring Security Filter Chain

```
Request
  → CORSFilter
    → JWTAuthenticationFilter (extract + validate token)
      → ApiKeyAuthenticationFilter (fallback if no JWT)
        → FeatureGateFilter (check tier access)
          → RateLimitFilter (check rate limit)
            → Controller
```

---

## Authorization Model

### Roles

| Role | Mô tả | Khi nào |
|---|---|---|
| `athlete` | User mặc định | Đăng ký |
| `coach` | Quản lý athletes | Phase 2, upgrade request |
| `admin` | Full access | Manual assignment |

### Subscription Tiers & Feature Gates

Mỗi API endpoint có thể gắn tier requirement:

```java
@RequiresTier("pro")
@GetMapping("/api/v1/training-load/pmc")
public ResponseEntity<?> getPMC() { ... }
```

**Flow:**
```
Request → JWTFilter (extract user) → FeatureGateFilter
  ↓
  Check: user.tier >= endpoint.requiredTier?
  ↓
  YES → proceed to controller
  NO  → 403 { "error": { "code": "UPGRADE_REQUIRED", "requiredTier": "pro", "message": "..." } }
```

**Feature flags DB check (for fine-grained control):**
```sql
SELECT 1 FROM feature_flags
WHERE name = 'advanced_analytics'
  AND (enabled_globally = true OR 'pro' = ANY(enabled_tiers))
```

### Rate Limiting

| Tier | API Limit |
|---|---|
| free | 500 requests/day |
| pro | 5,000 requests/day |
| elite | 20,000 requests/day |
| coach | 20,000 requests/day |

**Implementation:** Redis fixed daily window counter (đủ tốt cho MVP; upgrade sliding window nếu cần)

### Rate Limiting — Unauthenticated Endpoints

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| POST `/auth/login` | 5 attempts per email | 15 phút | `auth_login:{email}` |
| POST `/auth/login` | 20 per IP | 1 giờ | `auth_login_ip:{ip}` |
| POST `/auth/register` | 3 per IP | 1 giờ | `auth_register:{ip}` |
| GET `/auth/oauth/*` | 10 per IP | 1 phút | `auth_oauth:{ip}` |
| POST `/webhooks/*` | 100 per IP | 1 phút | `webhook:{ip}` |

**Account lockout:** Sau 10 login failures liên tiếp cho 1 email → lock 30 phút → notify user qua email (nếu có email service).

**Implementation:** Dùng Redis INCR + EXPIRE, check trước khi xử lý request.

```
Key:   rate_limit:{userId}:{YYYY-MM-DD}
Value: counter (INCR)
TTL:   86400 (auto-expire next day)
```

**Response headers:**
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 423
X-RateLimit-Reset: 1679961600 (UTC timestamp)
```

---

## Permission Matrix

| Resource | athlete (own) | coach (own athletes) | admin |
|---|---|---|---|
| Profile | CRUD | Read (if viewProfile) | CRUD |
| Activities | CRUD | Read (if readActivities) | CRUD |
| Activity Streams | Read | Read (if readActivityStreams) | Read |
| Activity Comments | Create + Read own | CRUD | CRUD |
| Workouts | CRUD | Read + Assign (if writeWorkouts) | CRUD |
| Calendar | CRUD | Read + Write (if writeCalendar) | CRUD |
| Wellness | CRUD | Read (if readWellness) | CRUD |
| Health Data | Read | Read (if readHealthData) | Read |
| Training Load | Read | Read (if readTrainingLoad) | Read |
| Sport Zones | CRUD | Read (if viewZones) | CRUD |
| Connections | CRUD | — | CRUD |
| API Keys | CRUD | — | CRUD |
| Coach Athletes | — | CRUD (own roster) | CRUD |
| Coach Invite Links | — | CRUD (own links) | CRUD |
| Feature Flags | — | — | CRUD |
| System Templates | — | — | CRUD |
| All Users | — | — | CRUD |

### Resource Ownership
- Mọi resource thuộc về 1 user (athlete)
- User chỉ truy cập resource của mình
- Coach truy cập athlete's resource CHỈ KHI:
  1. Có `coach_athletes` record status='active'
  2. Permission tương ứng = true
- Spring Security: `@PreAuthorize("@auth.isOwner(#id)")` cho athlete
- Spring Security: `@PreAuthorize("@coachAuth.hasAccess(#athleteId, 'readActivities')")` cho coach

---

## Coach-Athlete Relationship

### Upgrade to Coach
1. Athlete ở tier bất kỳ → mua Coach tier ($29/tháng)
2. Backend set `role = 'coach'` + `tier = 'coach'` 
3. Coach vẫn giữ tất cả athlete features (coach IS-A athlete)
4. Coach có thêm: multi-athlete management, workout assignment, athlete analytics

### Downgrade from Coach

| Scenario | Hành vi |
|---|---|
| Coach → Pro/Elite | Tất cả `coach_athletes` records → status='expired'. Coach mất management access ngay lập tức. Athlete data không bị ảnh hưởng. |
| Coach → Free | Như trên + mất Pro/Elite features |
| Payment failure | 7 ngày grace period (tier giữ nguyên, `subscription.status='past_due'`). Sau 7 ngày → auto-downgrade về Free |
| Coach cancel subscription | Effective cuối billing period. Athlete relationships maintained until tier actually changes |

**Tier hierarchy:** `free < pro < elite < coach < admin`

> **Quan trọng:** Coach tier bao gồm TẤT CẢ features của Elite. Athlete ở bất kỳ tier nào đều có thể upgrade trực tiếp lên Coach.

### Athlete Limit per Coach

| Tier | Max Athletes |
|---|---|
| Coach ($29/tháng) | 20 athletes |
| Coach Team (future) | Unlimited |

> Enforce bằng check khi `POST /coach/athletes/invite`: count active athletes < limit.

### Invite Flow

**Option A: Email invite**
1. Coach nhập email athlete → `POST /api/v1/coach/athletes/invite`
2. System tạo record `coach_athletes` (status='pending')
3. Gửi email invite với token (JWT, 7 ngày TTL)
4. Athlete click link → `GET /api/v1/coach/invites/{token}/accept`
5. Status → 'active', coach gets access

**Option B: Invite link**
1. Coach tạo shareable link → `POST /api/v1/coach/invite-link`
2. Link chứa unique code: `https://coachfit.app/join/{code}`
3. Athlete mở link → login/register → auto-accept
4. Link có thể 1-time-use hoặc reusable (coach chọn)

**Revoke:**
- Athlete: bất cứ lúc nào → `DELETE /api/v1/athlete/coach`
- Coach: bất cứ lúc nào → `DELETE /api/v1/coach/athletes/{athleteId}`
- Status → 'revoked', coach mất access ngay lập tức

### Table Definitions

> Schema chi tiết cho các bảng `coach_athletes`, `coach_invite_links`, `activity_comments` được định nghĩa trong [04-db-schema.md](./04-db-schema.md) § Support Tables. Tham khảo file đó cho đầy đủ columns, types, và indexes.

### Permissions JSONB Structure
```json
{
  "readActivities": true,
  "readActivityStreams": true,
  "readWellness": true,
  "readHealthData": true,
  "readTrainingLoad": true,
  "writeCalendar": true,
  "writeWorkouts": true,
  "writeComments": true,
  "viewProfile": true,
  "viewZones": true
}
```
Default: tất cả `true`. Athlete có thể tắt từng permission trong Settings.

### Coach Access Control (Spring Security)
```java
// Check coach has access to athlete
@PreAuthorize("@coachAuth.hasAccess(#athleteId, 'readActivities')")
@GetMapping("/api/v1/coach/athletes/{athleteId}/activities")
public ResponseEntity<?> getAthleteActivities(@PathVariable UUID athleteId) { ... }
```

Flow:
1. Extract coach userId from JWT
2. Query `coach_athletes` WHERE coach_user_id = ? AND athlete_user_id = ? AND status = 'active'
3. Check `permissions` JSONB contains required permission = true
4. If no match → 403 Forbidden

---

## Security Checklist

| Concern | Giải pháp |
|---|---|
| Password storage | BCrypt (strength 12) |
| OAuth tokens | AES-256-GCM encrypted trong DB. Key trong env var `OAUTH_ENCRYPTION_KEY`. Random IV per encryption, stored as prefix to ciphertext. Key rotation: re-encrypt on next token refresh |
| Encryption key rotation | Khi cần rotate key: set `OAUTH_ENCRYPTION_KEY_OLD` + `OAUTH_ENCRYPTION_KEY`. Decrypt with old, re-encrypt with new on next token use. Scheduled job re-encrypts all after 30 days |
| API keys | SHA-256 hashed, original shown once |
| JWT secret | 256-bit random, env variable |
| CORS | Whitelist frontend domain only |
| CSRF | Disabled (stateless JWT API) |
| Rate limiting | Redis-based per user + per IP (unauthenticated) |
| Input validation | Jakarta Bean Validation (@Valid) |
| SQL injection | JPA parameterized queries (never raw SQL concat) |
| XSS | React auto-escapes + CSP headers |
| HTTPS | Nginx SSL termination (Let's Encrypt) |
| Sensitive data in logs | Mask tokens, passwords, API keys |
| Token in URL | Never — always in Authorization header |
