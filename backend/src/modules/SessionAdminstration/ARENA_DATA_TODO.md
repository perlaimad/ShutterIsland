# SessionAdministration TODO

## Scope
- Session calendar and roster-level retrieval.

## Implement
- Repository/model for `arena_session` and `session_participant`
- `GET /api/sessions?month=YYYY-MM`
- `GET /api/sessions/:romanId`

## Notes
- Sort sessions by `starts_at` ascending.
- Include formatted status label + raw status.
