# MonitoringReporting TODO

## Scope
- Elimination log and real-time position snapshots.

## Implement
- Repository/model for `elimination_event`, `position_snapshot`
- `GET /api/sessions/:romanId/eliminations`
- `GET /api/sessions/:romanId/positions/latest`

## Notes
- Return elimination events ordered descending by `eliminated_at_seconds`.
- Latest position endpoint should return one record per active player.
