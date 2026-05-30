# AI Decisions

Date: 2026-05-29

## Decisions made

1. Kept the backend as a single Spring Boot 3 Maven project using Java 21 and Spring Modulith, matching the deployment and phase docs.
2. Created only the runtime foundation and package-level module boundaries for `auth`, `athlete`, `activity`, `workout`, `calendar`, `dashboard`, `wellness`, `health`, `gear`, `subscription`, and `sync`.
3. Deferred business endpoints, schema tables, and adapter implementations to later tickets to respect the "no product features" constraint.
4. Used one Docker image for both `backend-api` and `backend-worker`, with behavior switched by Spring profiles (`prod,api` and `prod,worker`) as documented.
5. Added `application-api.yml` and `application-worker.yml` so the worker can run without starting the HTTP server while still sharing the same codebase.
6. Left Flyway enabled but without business migrations so the scaffold is ready for schema work without prematurely defining tables.
7. Corrected the production compose dependency to `backend-api` for the frontend service because the deployment doc lists `backend-api` as the actual service name.
8. Added repo-local Maven settings plus a binary Maven wrapper because the machine-global Maven settings pointed to an unreachable mirror.

## Follow-up expected in later backend tickets

- Shared config/security/exception foundation classes
- Actual hexagonal subpackages and module internals
- First Flyway migrations from `docs/04-db-schema.md`
- API/worker responsibilities beyond profile separation

---

Date: 2026-05-30

## Decisions made — Backend Hardening Ticket (tier gating, rate limiting, privacy/compliance)

9. **Consent persistence object**: Created a minimal `consents` table (V021) and a `consent` Spring Modulith module with a single `ConsentUseCase` port. The `type` column is `VARCHAR(80)` (free-form string, not a DB enum) so that new consent types (e.g., future analytics, marketing) can be added without additional migrations. Policy version is stored but defaults to `null` until a versioning process is formalised in Phase 2. Decision: keep consent as a first-class module rather than embedding it in `auth` to maintain hexagonal boundaries.

10. **`processing_restricted` column**: Added via V022 migration as `BOOLEAN NOT NULL DEFAULT false` on the `users` table. Chosen over a separate table because the restriction is a single binary flag per user with no history requirement. If history of restriction changes is needed in Phase 2, a dedicated `processing_restriction_events` table can be added.

11. **Export job design (async, 202 Accepted)**: The `GET /account/export` endpoint creates an export job record (V023 `export_jobs` table) and returns `202 Accepted` immediately. No ZIP generation or email delivery in this ticket — the worker responsibility is a stub placeholder pending email service integration. Rate-limited via Redis key `export_request:{userId}:{YYYY-MM-DD}` (1/24h per docs/11-privacy-compliance.md §3.1).

12. **OAuth connection revocation on DELETE /account**: `DELETE /account` soft-revokes OAuth connections by setting `sync_status = 'revoked'` in the DB immediately (stops sync without external HTTP). Actual provider-side token revocation (Strava API call, Garmin deregistration push) is deferred to the async worker. This is documented as a known gap — no external HTTP calls in this ticket.

13. **FeatureGateFilter handler resolution fails open**: If `RequestMappingHandlerMapping.getHandler()` throws (e.g., no mapping, dispatcher not initialised), the filter logs a warning and passes the request through. The downstream 401/403/404 handler responds normally. This prevents infrastructure issues from locking out all authenticated users.

14. **Springdoc OpenAPI exposure**: `/v3/api-docs/**`, `/swagger-ui/**`, and `/swagger-ui.html` are permitted without auth (same as `/actuator/health`). This is the standard for dev/staging. Lock down with IP allowlist at Nginx level for production if needed — no code change required.

