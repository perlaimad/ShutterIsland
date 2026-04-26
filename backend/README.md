# ShutterIsland Backend

Backend API for ShutterIsland session management, gameplay control, monitoring, live metrics,
and authentication.

## Prerequisites
- Node.js 22+
- npm
- MySQL 8+

## Setup
1. Install dependencies:
   - `npm install`
2. Create local env file:
   - `Copy-Item .env.example .env`
3. Update DB credentials in `.env`.
   - Keep secrets only in `.env` (local, gitignored), never in `.env.example`.
4. Start development server:
   - `npm run dev`
5. Run quality checks:
   - `npm run check`
   - `npm test`

## Scripts
- `npm run dev`: start nodemon development server.
- `npm start`: start production server.
- `npm run check`: syntax checks across backend modules/scripts.
- `npm test`: auth and route protection tests.
- `npm run db:test`: database connectivity smoke test.
- `npm run db:validate`: schema, seed, index, and representative query validation.
- `npm run db:backup -- <file.sql>`: export DB backup with `mysqldump`.
- `npm run db:restore -- <file.sql>`: restore SQL file with `mysql`.

## Route Overview
- `GET /health`
- `GET /api/auth/access-control/roles`
- `POST /api/auth/staff/login`
- `GET /api/auth/staff/me`
- `POST /api/auth/viewer/login`
- `GET /api/auth/viewer/me`
- `GET /api/session-administration/sessions`
- `POST /api/session-administration/sessions`
- `PATCH /api/session-administration/sessions/:sessionId`
- `DELETE /api/session-administration/sessions/:sessionId`
- `GET /api/session-administration/sessions/:sessionId`
- `GET /api/session-administration/sessions/:sessionId/participants`
- `POST /api/session-administration/sessions/:sessionId/participants`
- `POST /api/session-administration/sessions/:sessionId/participants/:playerId/check-in`
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`
- `GET /api/game-management/sessions/:sessionId/timer`
- `POST /api/game-management/sessions/:sessionId/timer/start`
- `POST /api/game-management/sessions/:sessionId/timer/pause`
- `POST /api/game-management/sessions/:sessionId/timer/resume`
- `POST /api/game-management/sessions/:sessionId/timer/stop`
- `GET /api/game-management/sessions/:sessionId/challenges/sequence`
- `POST /api/game-management/sessions/:sessionId/challenges/trigger`
- `GET /api/game-management/sessions/:sessionId/levels/progression`
- `POST /api/game-management/sessions/:sessionId/levels/progress`
- `GET /api/game-management/sessions/:sessionId/events`
- `POST /api/game-management/sessions/:sessionId/events`
- `POST /api/game-management/sessions/:sessionId/participants/actions`
- `GET /api/game-management/sessions/:sessionId/eliminations`
- `POST /api/game-management/sessions/:sessionId/eliminations`
- `GET /api/game-management/sessions/:sessionId/performance/flow`
- `GET /api/game-management/sessions/:sessionId/finish-conditions`
- `POST /api/game-management/sessions/:sessionId/finish-conditions/detect`
- `GET /api/game-management/sessions/:sessionId/final-rankings`
- `POST /api/game-management/sessions/:sessionId/final-rankings/assign`
- `GET /api/game-management/sessions/:sessionId/state/sync`
- `GET /api/sessions/:sessionIdentifier/live`
- `POST /api/sessions/:sessionIdentifier/viewer-access-keys`
- `POST /api/sessions/:sessionIdentifier/viewer-access-keys/:accessId/revoke`
- `POST /api/sessions/:sessionIdentifier/bets`
- `POST /api/sessions/:sessionIdentifier/bets/settle`
- `POST /api/sessions/:sessionIdentifier/bets/cancel-pending`
- `GET /api/admin/stream`
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/dashboard/sessions`
- `GET /api/admin/dashboard/participants`
- `GET /api/admin/logs/audit`
- `POST /api/admin/logs/audit`
- `GET /api/admin/reports/session-performance`
- `GET /api/admin/reports/participant-summary`
- `GET /api/admin/reports/session-events`
- `GET /api/sessions/:sessionIdentifier/eliminations`
- `GET /api/sessions/:sessionIdentifier/positions/latest`

## Notes
- Most operational/admin routes require authenticated staff tokens.
- Viewer bet placement requires authenticated viewer token.
- `GET /api/admin/stream` accepts bearer token via query parameter `access_token` for
  EventSource compatibility.
