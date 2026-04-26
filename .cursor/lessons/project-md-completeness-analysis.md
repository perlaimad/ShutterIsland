# PROJECT.md Completeness Analysis

When analyzing `PROJECT.md` for completeness, compare it against these implementation sources:

- Backend routes and services under `backend/src`, especially authentication, session administration, game management, live metrics, monitoring, and SSE.
- Frontend pages under `frontend/shutterisland/src/pages` and hooks under `frontend/shutterisland/src/hooks`.
- Database source of truth in `database/schema.sql` and `database/data.sql`.
- Module TODO files under `backend/src/modules/*/ARENA_DATA_TODO.md`.
- Setup docs in `README.md`, `backend/README.md`, `database/README.md`, and package scripts.

Important gaps found:

- `PROJECT.md` is mostly an SRS/report, not a living implementation guide. It should add a current implementation status section.
- Backend implementation now includes auth/RBAC tokens, session CRUD, game timers, challenge progression, eliminations, final rankings, live metrics, monitoring reports, audit logs, and SSE, but `PROJECT.md` does not map actual routes and services to requirements.
- Frontend implementation includes static/mock home content, fallback-heavy sessions/admin pages, session detail API integration, staged login/register forms, theme handling, and realtime admin refreshes; these are not documented as current behavior or limitations.
- Database schema includes timer fields, JSON payloads, audit details, bet columns named `predicted_value`/`actual_value`/`bet_status`, and max players of 7; `PROJECT.md` should match these exact column names and constraints.
- TODO files and `backend/README.md` are stale in places, still describing placeholder endpoints even though several modules are implemented.
- Requirements for payment gateway, real stream encryption/delivery, bet placement/settlement/refunds, backups, account registration, and full admin auth enforcement remain specified but not fully implemented.

## Follow-up implementation lesson (final-product pass)

- Keep `PROJECT.md` implementation addendum synchronized after each backend/frontend milestone, especially route lists and "Specified but not fully implemented" sections.
- EventSource auth on browsers cannot send `Authorization` headers directly; support query token fallback (for example `access_token`) in auth middleware when securing SSE routes.
- Route protection changes should be validated with negative tests first (`401`/`403`) so protection can be verified without requiring live database fixtures.
- For frontend API hardening, add central auth helpers (`save/load/getAuthHeaders`) so pages can adopt protected endpoints without duplicating token logic.
- Keep seed/schema additions paired with backward-compatible backend fallbacks where possible (arena tables + room-derived fallback), so environments without immediate DB migration still function.
- When adding Playwright tests alongside Vitest in a Vite project, exclude `e2e/**` from Vitest config to avoid Playwright `test.describe()` runtime conflicts.
- Avoid mocking `window.setTimeout` globally in React Testing Library tests that rely on `waitFor`/`findBy*`; it can stall async polling and cause test timeouts.
- For browser-targeted ESLint configs (`globals.browser`), use `globalThis.process?.env` in config/test files to avoid `process is not defined` lint errors.
