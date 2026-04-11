# LiveStreamingPaymentBetting TODO

## Scope
- Live session metrics used by hero live panel.

## Implement
- Aggregates from `session_participant`
- `GET /api/sessions/:romanId/live`
  - active players
  - odds list
  - total pool
  - MVP and top bet

## Notes
- Keep amount fields numeric in response and add display fields only if needed.
