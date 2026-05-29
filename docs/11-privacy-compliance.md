# Privacy & Compliance — CoachFit

> Tài liệu mô tả chiến lược bảo mật dữ liệu, tuân thủ GDPR, và quyền riêng tư người dùng cho hệ thống CoachFit.

---

## 1. Tổng quan (Overview)

CoachFit lưu trữ **dữ liệu sức khỏe nhạy cảm** (sensitive health data) bao gồm:

- HRV (Heart Rate Variability)
- Heart rate (nhịp tim)
- Sleep data (dữ liệu giấc ngủ)
- GPS tracks (tọa độ vị trí)
- Weight (cân nặng)
- Stress level (mức độ căng thẳng)

Theo quy định **GDPR (General Data Protection Regulation)**, dữ liệu sức khỏe thuộc **Điều 9 — Special Categories of Personal Data** và yêu cầu mức bảo vệ cao nhất.

CoachFit **PHẢI** tuân thủ GDPR cho tất cả người dùng EU, bao gồm:
- Cơ sở pháp lý rõ ràng cho việc xử lý dữ liệu (lawful basis)
- Quyền truy cập, xóa, chỉnh sửa dữ liệu của người dùng
- Chính sách lưu trữ và xóa dữ liệu minh bạch
- Mã hóa dữ liệu at-rest và in-transit

---

## 2. Phân loại dữ liệu (Data Classification)

| Phân loại | Trường dữ liệu | GDPR Category |
|---|---|---|
| **PII (Personally Identifiable Information)** | `email`, `full_name`, `date_of_birth`, `avatar_url` | Personal Data |
| **Sensitive Health Data (Điều 9)** | `heart_rate`, `hrv`, `sleep_data`, `weight`, `stress_level`, `resting_hr`, `spo2`, `body_battery`, `wellness_logs` | Special Category — yêu cầu explicit consent |
| **Location Data** | GPS tracks (`latitude`/`longitude`), `start_lat`/`start_lng` | Personal Data — có thể suy ra nơi ở/làm việc |
| **Authentication** | `password_hash`, OAuth tokens, `api_keys` | Credentials — không bao giờ expose qua API |
| **Behavioral** | `activities`, `workouts`, `training_load`, `calendar_events` | Personal Data |

> **⚠️ Lưu ý:** Dữ liệu Location + Health kết hợp có thể tạo hồ sơ chi tiết về người dùng → cần bảo vệ nghiêm ngặt.

---

## 3. Quyền người dùng (User Rights Implementation)

### 3.1. Right to Access — Quyền truy cập (Điều 15)

```
GET /api/v1/account/export
```

- Trả về file **ZIP** chứa tất cả dữ liệu người dùng dưới dạng JSON files
- Phân nhóm theo entity type:
  - `user_profile.json`
  - `activities.json`
  - `health_data.json`
  - `wellness_logs.json`
  - `workouts.json`
  - `oauth_connections.json` (redacted tokens)
  - `coach_relationships.json`
  - `gear.json`
- **Rate limit**: 1 request / 24 giờ
- **Xử lý async**: Tạo export job trong background → gửi notification (email + in-app) khi file sẵn sàng
- File export có pre-signed URL, hết hạn sau **7 ngày**

### 3.2. Right to Erasure — Quyền xóa (Điều 17)

```
DELETE /api/v1/account
```

- **Soft delete** ngay lập tức: set `users.deleted_at = now()`
- **Hard delete** TẤT CẢ dữ liệu sau **30 ngày** grace period (cho phép hủy xóa)
- Dữ liệu cần xóa bao gồm:
  - Tất cả DB records liên quan đến user
  - MinIO files: FIT/TCX/GPX files, avatars
  - Redis cache entries
  - `sync_logs`
  - `audit_logs` → **anonymize** (thay user_id bằng UUID zero), KHÔNG xóa
- **Revoke** tất cả OAuth tokens tại providers (Strava, Garmin)
- Gửi **email xác nhận** cho người dùng

### 3.3. Right to Rectification — Quyền chỉnh sửa (Điều 16)

Các endpoint `PUT` hiện tại đã cover quyền này:

- `PUT /api/v1/users/me` — cập nhật profile
- `PUT /api/v1/athlete-profile` — cập nhật athlete profile
- `PUT /api/v1/settings` — cập nhật settings

### 3.4. Right to Data Portability — Quyền chuyển dữ liệu (Điều 20)

```
GET /api/v1/account/export
```

- Endpoint `export` ở trên đã cover (JSON format, machine-readable)
- JSON là format chuẩn, dễ import vào hệ thống khác
- Có thể mở rộng hỗ trợ CSV trong tương lai

### 3.5. Right to Restrict Processing — Quyền hạn chế xử lý

```
PUT /api/v1/account/restrict
```

- **Pause** tất cả sync jobs cho user
- **Stop** xử lý webhooks từ providers
- **Giữ nguyên** dữ liệu nhưng **không xử lý thêm**
- User có thể re-enable bất kỳ lúc nào
- Trạng thái: `users.processing_restricted = true`

---

## 4. Chính sách lưu trữ dữ liệu (Data Retention Policies)

| Loại dữ liệu | Thời gian lưu | Lý do |
|---|---|---|
| Activities | Đến khi xóa tài khoản | Core service — dữ liệu chính |
| Activity streams (GPS, HR, power) | Đến khi xóa tài khoản | Core service — dữ liệu chi tiết |
| Health data (daily summaries, sleep) | Đến khi xóa tài khoản | Core service — theo dõi sức khỏe |
| Sync logs | **90 ngày** | Debugging — auto-purge sau 90 ngày |
| Audit logs | **2 năm** (anonymized sau khi xóa tài khoản) | Compliance — yêu cầu pháp lý |
| Raw webhook payloads | **30 ngày** | Debugging — auto-purge sau 30 ngày |
| Workout export files | **7 ngày** | Temporary — pre-signed URLs hết hạn |
| Backups chứa user data | **30 ngày rolling** | Disaster recovery |

### Auto-purge Jobs

```sql
-- Chạy hàng ngày lúc 2:00 AM UTC

-- Purge sync logs > 90 ngày
DELETE FROM sync_logs WHERE created_at < now() - INTERVAL '90 days';

-- Purge raw webhook payloads > 30 ngày
DELETE FROM webhook_payloads WHERE created_at < now() - INTERVAL '30 days';

-- Purge expired export files
DELETE FROM export_jobs WHERE created_at < now() - INTERVAL '7 days';
-- + Xóa file tương ứng trên MinIO
```

---

## 5. Quản lý đồng ý (Consent Management)

### 5.1. Đăng ký (Registration)

- **Explicit consent checkbox** cho việc xử lý dữ liệu sức khỏe
- Không pre-check — người dùng phải tự tick
- Lưu consent record: `consents` table với `type`, `granted_at`, `ip_address`
- Không thể đăng ký nếu không đồng ý xử lý health data

### 5.2. OAuth Connect

- **Explicit consent** cho TỪNG provider (Strava, Garmin, v.v.)
- Hiển thị rõ: "Dữ liệu nào sẽ được sync? Dữ liệu sẽ được xử lý như thế nào?"
- Lưu consent record khi user kết nối provider
- User có thể disconnect bất kỳ lúc nào

### 5.3. Cookie Consent

- Refresh token lưu dưới dạng **httpOnly cookie**
- Yêu cầu **cookie consent banner** theo ePrivacy Directive
- Phân loại:
  - **Necessary**: httpOnly auth cookie (không cần consent)
  - **Functional**: language preference, theme
  - **Analytics**: nếu có tracking trong tương lai

### 5.4. Coach Relationship

- Athlete phải **explicit accept** lời mời từ coach
- Có thể **revoke** (hủy) bất kỳ lúc nào
- Athlete kiểm soát coach có thể xem gì thông qua **granular JSONB permissions**:

```json
{
  "can_view_activities": true,
  "can_view_health_data": false,
  "can_view_location": false,
  "can_view_wellness": true,
  "can_create_workouts": true,
  "can_comment": true
}
```

### 5.5. Data Sharing

- Athlete **kiểm soát hoàn toàn** dữ liệu nào coach được xem
- Permissions lưu trong `coach_athletes.permissions` (JSONB)
- Thay đổi có hiệu lực ngay lập tức
- Coach KHÔNG thể export dữ liệu của athlete

---

## 6. Mã hóa dữ liệu (Data Encryption)

| Layer | Phương pháp | Chi tiết |
|---|---|---|
| **At Rest — Database** | AES-256-GCM | OAuth tokens, API keys mã hóa trong DB. Sử dụng application-level encryption (không dựa vào DB encryption) |
| **In Transit** | TLS 1.2+ | Nginx SSL termination. HSTS header enabled. Certificate từ Let's Encrypt |
| **Backups** | pg_dump + gzip | ⚠️ Cần thêm: encrypt với GPG trước khi lưu trữ |
| **MinIO (Object Storage)** | Server-side encryption (SSE) | Enabled by default. Encryption key managed bởi MinIO |

### Encryption Flow cho OAuth Tokens

```
User connects Strava
  → Receive access_token + refresh_token
  → Encrypt with AES-256-GCM + per-user nonce
  → Store encrypted blob in oauth_connections.access_token_encrypted
  → On API call to Strava: decrypt → use → discard plaintext
```

---

## 7. Chuyển dữ liệu xuyên biên giới (Cross-Border Data Transfer)

### Chiến lược: Giữ dữ liệu EU trong EU

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| **VPS chính** | 🇩🇪 Hetzner Germany | Recommended — giữ dữ liệu EU trong EU |
| **Database (PostgreSQL)** | 🇩🇪 Hetzner Germany | Cùng VPS |
| **Object Storage (MinIO)** | 🇩🇪 Hetzner Germany | Cùng VPS |

### Third-party Processors

| Processor | Vị trí | Mục đích | Cơ sở pháp lý |
|---|---|---|---|
| **Strava** | 🇺🇸 US | Sync activities | User consent tại OAuth connect |
| **Garmin** | 🇺🇸 US | Sync health data | User consent tại OAuth connect |
| **Google** | 🇺🇸 US | OAuth login | User consent tại đăng nhập |
| **SendGrid** | 🇺🇸 US | Transactional email | Legitimate interest — cần thêm vào Privacy Policy |

> **⚠️ Lưu ý:** Tất cả US processors phải có **DPA (Data Processing Agreement)** hoặc tuân thủ **EU-US Data Privacy Framework**.

---

## 8. Quy trình xóa tài khoản (Account Deletion Implementation)

### API Request

```
DELETE /api/v1/account
Authorization: Bearer <jwt>
```

### Quy trình xử lý

```
Step 1: Set users.deleted_at = now()
Step 2: Invalidate all JWT refresh tokens
Step 3: Revoke OAuth tokens at all providers
Step 4: Cancel Stripe subscription (if active)
Step 5: Return 200 {"message": "Account scheduled for deletion", "deletionDate": "2025-04-14"}
```

### Scheduled Job — Hard Delete (Daily, 3:00 AM UTC)

```sql
-- Chạy cho mỗi user có deleted_at < now() - 30 days

-- 1. Xóa activities và dữ liệu liên quan
DELETE FROM activities WHERE user_id = ?;
DELETE FROM activity_streams WHERE user_id = ?;
DELETE FROM activity_laps WHERE user_id = ?;

-- 2. Xóa health data
DELETE FROM health_daily_summaries WHERE user_id = ?;
DELETE FROM health_sleep_data WHERE user_id = ?;

-- 3. Xóa wellness và training
DELETE FROM wellness_logs WHERE user_id = ?;
DELETE FROM training_load WHERE user_id = ?;

-- 4. Xóa workouts và calendar
DELETE FROM workouts WHERE user_id = ?;
DELETE FROM calendar_events WHERE user_id = ?;

-- 5. Xóa coach relationships
DELETE FROM coach_athletes WHERE coach_user_id = ? OR athlete_user_id = ?;

-- 6. Xóa notifications và comments
DELETE FROM notifications WHERE user_id = ?;
DELETE FROM activity_comments WHERE user_id = ?;

-- 7. Xóa OAuth, API keys, sync logs
DELETE FROM oauth_connections WHERE user_id = ?;
DELETE FROM api_keys WHERE user_id = ?;
DELETE FROM sync_logs WHERE user_id = ?;

-- 8. Xóa gear, zones, profiles, subscriptions
DELETE FROM gear WHERE user_id = ?;
DELETE FROM sport_zones WHERE user_id = ?;
DELETE FROM athlete_profiles WHERE user_id = ?;
DELETE FROM subscriptions WHERE user_id = ?;

-- 9. Anonymize audit logs (KHÔNG xóa)
UPDATE audit_log SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = ?;

-- 10. Xóa MinIO files
-- raw-files/{userId}/*
-- avatars/{userId}/*

-- 11. Xóa Redis keys
-- rate_limit:{userId}:*
-- tier_changed:{userId}

-- 12. Xóa user record
DELETE FROM users WHERE id = ?;

-- 13. Log completion (anonymized)
INSERT INTO audit_log (action, details, created_at)
VALUES ('ACCOUNT_HARD_DELETED', '{"note": "All user data purged"}', now());
```

### Cancel Deletion (trong 30 ngày)

```
POST /api/v1/account/cancel-deletion
Authorization: Bearer <jwt>
```

- Set `users.deleted_at = NULL`
- Restore account access
- ⚠️ OAuth tokens đã bị revoke → user cần reconnect providers

---

## 9. API Endpoints Summary

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/api/v1/account/export` | Request full data export (ZIP) | ✅ Required |
| `DELETE` | `/api/v1/account` | Schedule account deletion (30-day grace) | ✅ Required |
| `POST` | `/api/v1/account/cancel-deletion` | Cancel pending deletion (within 30 days) | ✅ Required |
| `PUT` | `/api/v1/account/restrict` | Restrict/pause data processing | ✅ Required |
| `GET` | `/api/v1/account/privacy` | Current privacy settings + consent log | ✅ Required |

---

## 10. Compliance Checklist

- [ ] Privacy policy page (public, linked in footer)
- [ ] Cookie consent banner (ePrivacy Directive)
- [ ] Data export endpoint (`GET /account/export`)
- [ ] Account deletion endpoint (`DELETE /account`)
- [ ] Cancel deletion endpoint (`POST /account/cancel-deletion`)
- [ ] Provider OAuth revocation on account delete
- [ ] Sync log auto-purge (90 ngày)
- [ ] Raw payload auto-purge (30 ngày)
- [ ] Export file auto-purge (7 ngày)
- [ ] DPA (Data Processing Agreement) template cho coaches
- [ ] Incident response plan cho data breaches
- [ ] Consent logging — lưu record mỗi khi user đồng ý/từ chối
- [ ] Age verification — GDPR yêu cầu 16+ (hoặc 13+ tùy quốc gia)

---

## Tham khảo

- [GDPR Full Text](https://gdpr-info.eu/)
- [GDPR Article 9 — Special Categories](https://gdpr-info.eu/art-9-gdpr/)
- [GDPR Article 15 — Right of Access](https://gdpr-info.eu/art-15-gdpr/)
- [GDPR Article 17 — Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 20 — Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
