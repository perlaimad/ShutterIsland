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
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`
- `GET /api/sessions?month=YYYY-MM`
- `GET /api/sessions/:romanId`
- `GET /api/sessions/:romanId/live`
- `GET /api/sessions/:romanId/eliminations`
- `GET /api/sessions/:romanId/positions/latest`

Current API route handlers return `501 Not Implemented` placeholders until module repositories/services are implemented.

## Important Note
SQL files in `database/migrations` and `database/seeders` are now MySQL 8-compatible.  
Run migrations first, then seed scripts in order.
