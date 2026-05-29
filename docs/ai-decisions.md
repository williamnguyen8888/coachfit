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

## Follow-up expected in later backend tickets

- Shared config/security/exception foundation classes
- Actual hexagonal subpackages and module internals
- First Flyway migrations from `docs/04-db-schema.md`
- API/worker responsibilities beyond profile separation
