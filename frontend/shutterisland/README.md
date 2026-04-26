# ShutterIsland Frontend

React + Vite frontend for ShutterIsland pages:

- Home (`/`)
- Sessions (`/sessions`)
- Session details (`/sessions/:id`)
- Admin dashboard (`/dashboard`)
- Login (`/login`)
- Register (`/register`)

## Scripts
- `npm run dev`: start Vite dev server.
- `npm test`: run Vitest unit/component test suite.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run e2e`: run Playwright end-to-end suite.
- `npm run e2e:headed`: run Playwright in headed mode.
- `npm run lint`: run ESLint.
- `npm run build`: create production build.
- `npm run preview`: preview production build.

## Environment
- `VITE_API_URL`: backend base URL (default `http://localhost:4000`).
- `VITE_API_BASE_URL`: optional API base override used by the sessions page.

## Auth Storage
The login page stores auth session data in local storage under:
- `shutterisland-auth`

Pages use this stored token for authenticated API requests and realtime admin stream updates.

## Notes
- Some pages keep fallback/mock states to avoid blank screens when API requests fail.
- Register page is currently informational; account creation is still admin-managed.
- Playwright workflows are gated behind `RUN_E2E=1` and expect local frontend/backend services.
