# Deployment & Infrastructure — CoachFit

## Tổng Quan

Toàn bộ infrastructure chạy Docker Compose, self-hosted trên VPS để tiết kiệm chi phí.

| Service | Image | Port | Mô tả |
|---|---|---|---|
| frontend | node:22-alpine (Next.js 15) | 3000 | Frontend SSR + PWA |
| backend-api | eclipse-temurin:21-jre (Spring Boot 3 + Spring Modulith) | 8080 | REST API server |
| backend-worker | eclipse-temurin:21-jre (Spring Boot 3 + Spring Modulith) | — | Sync workers + scheduled jobs |
| postgres | postgres:16-alpine | 5432 | Database |
| redis | redis:7-alpine | 6379 | Cache + Job queue |
| minio | minio/minio:latest | 9000, 9001 | Object storage |
| nginx | nginx:alpine | 80, 443 | Reverse proxy + SSL |

---

## Project Structure

```
coachfit/
├── docker-compose.yml          # Production
├── docker-compose.dev.yml      # Development (hot reload)
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── certs/                  # SSL certificates
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js               # Service worker
│   └── src/
│       ├── app/                # Next.js App Router
│       │   ├── layout.tsx
│       │   ├── page.tsx        # Dashboard
│       │   ├── login/
│       │   ├── register/
│       │   ├── onboarding/
│       │   ├── calendar/
│       │   ├── workouts/
│       │   ├── activities/
│       │   ├── analytics/
│       │   └── settings/
│       ├── components/         # Reusable UI components
│       │   ├── ui/             # Primitives (Button, Card, Input...)
│       │   ├── charts/         # Chart components
│       │   ├── calendar/       # Calendar components
│       │   ├── workout/        # Workout builder components
│       │   └── layout/         # Nav, Sidebar, Header
│       ├── lib/                # Utilities
│       │   ├── api.ts          # API client (fetch wrapper)
│       │   ├── auth.ts         # JWT handling
│       │   └── utils.ts
│       ├── hooks/              # Custom React hooks
│       ├── stores/             # Zustand state management
│       └── styles/
│           └── globals.css     # Design tokens + base styles
├── backend/
│   ├── Dockerfile
│   ├── pom.xml                 # Maven + Spring Modulith
│   └── src/
│       ├── main/
│       │   ├── java/com/coachfit/
│       │   │   ├── CoachFitApplication.java
│       │   │   ├── shared/                           # cross-cutting only, not a dump folder
│       │   │   │   ├── config/
│       │   │   │   │   ├── RedisConfig.java
│       │   │   │   │   ├── MinioConfig.java
│       │   │   │   │   ├── CorsConfig.java
│       │   │   │   │   └── SwaggerConfig.java
│       │   │   │   ├── security/
│       │   │   │   │   ├── SecurityConfig.java
│       │   │   │   │   ├── JwtTokenProvider.java
│       │   │   │   │   ├── JwtAuthenticationFilter.java
│       │   │   │   │   ├── ApiKeyAuthenticationFilter.java
│       │   │   │   │   └── RateLimitFilter.java
│       │   │   │   ├── feature/
│       │   │   │   │   ├── FeatureGateFilter.java
│       │   │   │   │   ├── RequiresTier.java
│       │   │   │   │   └── FeatureFlagService.java
│       │   │   │   ├── crypto/
│       │   │   │   ├── exception/
│       │   │   │   │   ├── GlobalExceptionHandler.java
│       │   │   │   │   └── ApiException.java
│       │   │   │   ├── pagination/
│       │   │   │   ├── time/
│       │   │   │   └── ids/
│       │   │   ├── auth/
│       │   │   │   ├── package-info.java            # @ApplicationModule
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── athlete/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── activity/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── workout/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── calendar/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── dashboard/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/in/web/
│       │   │   ├── wellness/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── health/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── gear/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   ├── subscription/
│       │   │   │   ├── package-info.java
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/in/
│       │   │   │   │   ├── port/out/
│       │   │   │   │   └── service/
│       │   │   │   └── adapter/
│       │   │   │       ├── in/web/
│       │   │   │       └── out/persistence/
│       │   │   └── sync/                            # isolated integration module
│       │   │       ├── package-info.java
│       │   │       ├── domain/
│       │   │       ├── application/
│       │   │       │   ├── port/in/
│       │   │       │   ├── port/out/
│       │   │       │   └── service/
│       │   │       ├── adapter/
│       │   │       │   ├── in/web/
│       │   │       │   ├── in/webhook/
│       │   │       │   ├── in/job/
│       │   │       │   ├── out/persistence/
│       │   │       │   ├── out/provider/
│       │   │       │   │   ├── strava/
│       │   │       │   │   ├── garmin/
│       │   │       │   │   ├── coros/
│       │   │       │   │   └── polar/
│       │   │       │   ├── out/storage/
│       │   │       │   └── out/queue/
│       │   │       ├── parser/
│       │   │       │   ├── FitFileParser.java
│       │   │       │   ├── TcxFileParser.java
│       │   │       │   └── GpxFileParser.java
│       │   │       └── metrics/
│       │   │           ├── NormalizedPowerCalc.java
│       │   │           ├── TssCalculator.java
│       │   │           └── TrainingLoadUpdater.java
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       └── db/migration/   # Flyway migrations
│       │           ├── V001__create_users.sql
│       │           └── ...
│       └── test/
│           └── java/com/coachfit/
│               ├── ApplicationModulesTest.java      # ApplicationModules.of(...).verify()
│               ├── auth/
│               ├── athlete/
│               ├── activity/
│               ├── workout/
│               ├── calendar/
│               ├── dashboard/
│               ├── wellness/
│               ├── health/
│               ├── gear/
│               ├── subscription/
│               └── sync/
└── docs/                           # Tài liệu (thư mục này)
```

### Backend Architecture Rules

- Backend dùng `Spring Modulith` theo package trực tiếp dưới root `com.coachfit`:
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
- Mỗi module phải theo `hexagonal architecture`:
  - `domain/`
  - `application/port/in`
  - `application/port/out`
  - `application/service`
  - `adapter/in/*`
  - `adapter/out/*`
- Chỉ expose cross-module API qua:
  - `application.port.in`
  - facade package được annotate `@NamedInterface("api")` khi thật sự cần
  - domain event rõ ràng
- Không dùng global layer packages kiểu `controller/`, `service/`, `repository/`, `model/`, `dto/` ở root backend package.
- JPA entity, Spring Data repository, provider clients, Redis/MinIO adapters phải nằm trong module sở hữu tương ứng, không để ở global package.
- `sync` là module riêng cho webhook, queue jobs, provider adapters, file ingestion, và metrics update pipeline.
- `shared/` chỉ chứa cross-cutting concerns thật sự dùng chung: security, config, feature gating, crypto, ids, pagination, time, exception handling.
- Mỗi module nên có `package-info.java` để khai báo `@ApplicationModule` và giới hạn dependencies khi cần.
- Bắt buộc có test verify boundary bằng Spring Modulith:
  - `ApplicationModules.of(CoachFitApplication.class).verify()`
  - thêm `@ApplicationModuleTest` hoặc integration tests theo module khi cần

---

## Docker Compose (Production)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.coachfit.app
    depends_on:
      - backend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  backend-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod,api
      - DATABASE_URL=jdbc:postgresql://postgres:5432/coachfit
      - DATABASE_USERNAME=${DB_USER}
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}
      - STRAVA_CLIENT_SECRET=${STRAVA_CLIENT_SECRET}
      - GARMIN_CONSUMER_KEY=${GARMIN_CONSUMER_KEY}
      - GARMIN_CONSUMER_SECRET=${GARMIN_CONSUMER_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  backend-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - SPRING_PROFILES_ACTIVE=prod,worker
      - DATABASE_URL=jdbc:postgresql://postgres:5432/coachfit
      - DATABASE_USERNAME=${DB_USER}
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}
      - STRAVA_CLIENT_SECRET=${STRAVA_CLIENT_SECRET}
      - GARMIN_CONSUMER_KEY=${GARMIN_CONSUMER_KEY}
      - GARMIN_CONSUMER_SECRET=${GARMIN_CONSUMER_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=coachfit
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    volumes:
      - minio_data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    command: server /data --console-address ":9001"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - certbot_data:/var/www/certbot
    depends_on:
      - frontend
      - backend-api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
  certbot_data:
```

---

## Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=coachfit_dev
      - POSTGRES_USER=coachfit
      - POSTGRES_PASSWORD=dev_password
    volumes:
      - postgres_dev:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_dev:/data

volumes:
  postgres_dev:
  minio_dev:
```

Dev workflow: chỉ chạy infrastructure (PG + Redis + MinIO), frontend & backend chạy local với hot reload.

---

## Environment Variables (.env.example)

```env
# Database
DB_USER=coachfit
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key

# Strava
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Garmin Health API (OAuth 1.0a)
GARMIN_CONSUMER_KEY=your_garmin_consumer_key
GARMIN_CONSUMER_SECRET=your_garmin_consumer_secret

# JWT
JWT_SECRET=your_256bit_random_secret

# App
APP_URL=https://coachfit.app
API_URL=https://api.coachfit.app

# Stripe (Phase 2)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# Email (Transactional)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@coachfit.app

# OAuth Token Encryption
OAUTH_ENCRYPTION_KEY=your_256bit_encryption_key
```

---

## Nginx Config

```nginx
events {
    worker_connections 1024;
}

http {
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limit zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    # Frontend
    server {
        listen 443 ssl http2;
        server_name coachfit.app;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;

        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # API
    server {
        listen 443 ssl http2;
        server_name api.coachfit.app;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;

        client_max_body_size 50M;  # FIT file upload

        location / {
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://backend-api:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name coachfit.app api.coachfit.app;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }
}
```

---

## Dockerfiles

### Backend Dockerfile
```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Frontend Dockerfile
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Development Setup

```bash
# 1. Clone repo
git clone git@github.com:your-repo/coachfit.git
cd coachfit

# 2. Setup environment
cp .env.example .env
# Edit .env with dev values

# 3. Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# 4. Start backend (hot reload with Spring DevTools)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 5. Start frontend (hot reload)
cd frontend
npm install
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
# MinIO Console: http://localhost:9001
```

> **Database connection pool (production):** Configure HikariCP in `application-prod.yml`:
> - `spring.datasource.hikari.maximum-pool-size`: 15 (backend-api), 10 (backend-worker)
> - `spring.datasource.hikari.minimum-idle`: 5
> - `spring.datasource.hikari.connection-timeout`: 30000
> - `spring.datasource.hikari.max-lifetime`: 1800000

```bash
# Verify
# PostgreSQL: localhost:5432
```

---

## Production Deployment

```bash
# 1. Build & start
docker compose build
docker compose up -d

# 2. Run DB migrations (auto on startup via Flyway)
# Verify: docker compose logs backend | grep "migration"

# 3. SSL setup (first time)
certbot certonly --webroot -w /var/www/certbot \
  -d coachfit.app -d api.coachfit.app

# 4. Create MinIO buckets (first time)
docker compose exec minio mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
docker compose exec minio mc mb local/raw-files
docker compose exec minio mc mb local/workout-exports
docker compose exec minio mc mb local/backups

# 5. Verify
curl https://api.coachfit.app/actuator/health
```

---

## Backup Strategy

```bash
#!/bin/bash
# backup.sh — run daily via cron

DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
docker compose exec -T postgres pg_dump -U $DB_USER coachfit | gzip > /backups/db_${DATE}.sql.gz

# Upload to MinIO backups bucket
mc cp /backups/db_${DATE}.sql.gz local/backups/

# Keep last 30 days locally
find /backups -name "db_*.sql.gz" -mtime +30 -delete

# MinIO backup (raw files — irreplaceable)
mc mirror local/raw-files /backups/minio/raw-files/ --overwrite
mc mirror local/avatars /backups/minio/avatars/ --overwrite

# Environment backup (encrypted)
gpg --symmetric --cipher-algo AES256 -o /backups/env_${DATE}.gpg .env
```

Cron: `0 3 * * * /opt/coachfit/backup.sh`

---

## Monitoring (MVP)

| Tool | Mục đích |
|---|---|
| Spring Actuator | `/actuator/health`, `/actuator/info` |
| Docker logs | `docker compose logs -f backend` |
| Simple health check | Cron `curl` mỗi 5 phút |
| Disk usage alert | Script check disk > 80% |

Phase 2: Grafana + Prometheus + Loki

---

## VPS Requirements

| Resource | MVP (100 users) | Scale (10K users) |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 100 GB SSD |
| Bandwidth | 2 TB/month | 5 TB/month |
| Cost | ~$10-20/month | ~$30-50/month |

**Recommend:** Hetzner (EU) hoặc Contabo — giá tốt, hiệu suất ổn.

---

## Scale Roadmap

| Phase | Users | Architecture | Trigger |
|---|---|---|---|
| 1 — MVP | 0-1K | Single VPS, backend-api + backend-worker | Launch |
| 2 — Growth | 1K-10K | Load balancer, 2× backend-api, 1× worker | API p95 > 500ms |
| 3 — Scale | 10K-100K | PG read replica, Redis Sentinel, multiple workers | DB CPU > 70% |
| 4 — Platform | 100K+ | Kubernetes/Docker Swarm, managed PG, ElastiCache | Ops complexity |

> **Nguyên tắc:** Scale khi có data chứng minh cần thiết, không scale trước.

---

## MinIO Buckets

| Bucket | Nội dung | Retention |
|---|---|---|
| `raw-files` | FIT/TCX/GPX files gốc | Permanent |
| `workout-exports` | Generated .FIT workout files | 7 days (pre-signed URLs) |
| `backups` | DB backups | 30 days |
| `avatars` | User avatars | Permanent |
