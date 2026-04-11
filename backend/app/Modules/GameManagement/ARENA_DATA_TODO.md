# GameManagement Arena TODO

## Scope
- Arena geometry and static map entities.

## Implement
- Repository/model for `arena`, `arena_marker`, `arena_obstacle`, `arena_zone`
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`

## Notes
- Return marker coordinates in source arena coordinate system.
- Keep labels and color metadata as stored.
