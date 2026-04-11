# Arena Data API Contract (Phase 2)

## Primary Entities
- `arena`
- `player`
- `arena_zone`
- `arena_obstacle`
- `arena_marker`
- `arena_session`
- `session_participant`
- `elimination_event`
- `position_snapshot`

## Minimal Endpoints

### GameManagement
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`

### SessionAdministration
- `GET /api/sessions?month=YYYY-MM`
- `GET /api/sessions/:romanId`

### LiveStreamingPaymentBetting
- `GET /api/sessions/:romanId/live`
  - participants
  - odds
  - pool
  - active player count

### MonitoringReporting
- `GET /api/sessions/:romanId/eliminations`
- `GET /api/sessions/:romanId/positions/latest`

## Suggested Response Shape
```json
{
  "session": {
    "id": "VII",
    "status": "live",
    "startsAt": "2026-04-11T20:00:00+02:00",
    "pool": {
      "amount": 104402,
      "display": "$104,402"
    }
  },
  "participants": [],
  "eliminations": [],
  "positions": []
}
```

## Notes
- Keep all time fields in ISO-8601 with timezone offsets.
- Keep money numeric in DB/API and format in frontend.
- Keep roman IDs unique per arena.
