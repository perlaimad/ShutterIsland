# ShutterIsland

ShutterIsland is an indoor arena session platform with:
- Backend APIs for authentication, session administration, game management, live metrics,
  monitoring, reporting, and betting operations.
- Frontend dashboards/pages for admins and viewers.
- MySQL schema and seed data for local development and testing.

## Repository Structure
- `backend/`: Express + MySQL backend.
- `frontend/shutterisland/`: React + Vite frontend.
- `database/`: schema and seed SQL.
- `docs/`: supporting SRS/contract docs.
- `PROJECT.md`: full SRS report plus implementation addendum.

## Quick Start
1. Load database:
   - run `database/schema.sql`
   - run `database/data.sql`
2. Start backend:
   - in `backend/`: `npm install`, then `npm run dev`
3. Start frontend:
   - in `frontend/shutterisland/`: `npm install`, then `npm run dev`

## Quality Checks
- Backend: `npm run check`, `npm test`, `npm run db:test`, and `npm run db:validate`
- Frontend: `npm test`, `npm run e2e`, `npm run lint`, and `npm run build`
