# Database Setup

Use these files as the database source of truth:

1. `schema.sql` creates the `shutterisland` database and tables.
2. `data.sql` loads the mock data.

Run `schema.sql` first, then `data.sql`.

## Includes
- Session/gameplay tables (`game_session`, `session_player`, `session_room`, `elimination`,
  `environment_event`)
- Streaming/access/betting tables (`live_stream`, `viewer_access_key`, `bet`)
- Arena geometry tables (`arena_zone`, `arena_marker`, `arena_obstacle`)
- Audit table (`audit_log`)

