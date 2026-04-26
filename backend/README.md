# ShutterIsland Backend

Minimal backend scaffold for the arena/session API contract in `docs/SRS/arena-data-contract.md`.

## Prerequisites
- Node.js 22+
- npm
- MySQL 8+ (for DB-backed endpoint implementation)

## Setup
1. Install dependencies:
   - `npm install`
2. Create local env file:
   - `Copy-Item .env.example .env`
3. Update DB credentials in `.env`.
   - Keep secrets only in `.env` (local, gitignored), never in `.env.example`.
4. Start development server:
   - `npm run dev`

## Available Routes
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/staff/register`
- `POST /api/auth/staff/login`
- `GET /api/auth/staff/me`
- `POST /api/auth/viewer/login`
- `GET /api/auth/viewer/me`
- `GET /api/auth/access-control/roles`
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`
- `GET /api/sessions?month=YYYY-MM`
- `GET /api/sessions/:romanId`
- `GET /api/sessions/:romanId/live`
- `GET /api/sessions/:romanId/eliminations`
- `GET /api/sessions/:romanId/positions/latest`

Staff authentication returns Bearer tokens for protected staff routes. New staff registrations
are created with the `Staff` role; administrator accounts should be managed directly in the
database or through a future admin-only staff-management endpoint.

## Important Note
SQL files in `database/migrations` and `database/seeders` are now MySQL 8-compatible.  
Run migrations first, then seed scripts in order.
