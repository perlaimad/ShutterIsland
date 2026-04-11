# Arena Data Schema

This folder defines the canonical data model for arena state and live session tracking.

## Migration Order
1. `database/migrations/001_create_arena_core.sql`
2. `database/migrations/002_create_session_live.sql`

## Seed Order
1. `database/seeders/001_seed_arena_core.sql`
2. `database/seeders/002_seed_sessions_live.sql`

## Source of Truth During Transition
- Frontend fallback data: `frontend/shutterisland/src/data/homepageData.json`
- Backend mirror seed snapshot: `database/seeders/homepage_seed_source.json`

When backend APIs are live, frontend should read through API adapters and retain JSON only as local fallback.
