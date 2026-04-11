-- 002_seed_sessions_live.sql
-- Seeds sessions, participants, and elimination events from homepageData.json.

INSERT INTO arena_session (id, arena_id, roman_id, starts_at, local_time_label, status, pool_amount, pool_label)
VALUES
  (1, 1, 'I',   '2026-03-06T19:00:00+02:00', '19:00', 'closed',   41200,  '$41,200'),
  (2, 1, 'II',  '2026-03-13T19:00:00+02:00', '19:00', 'closed',   38750,  '$38,750'),
  (3, 1, 'III', '2026-03-20T20:00:00+02:00', '20:00', 'closed',   45100,  '$45,100'),
  (4, 1, 'IV',  '2026-03-27T19:30:00+02:00', '19:30', 'closed',   52000,  '$52,000'),
  (5, 1, 'V',   '2026-04-03T19:00:00+02:00', '19:00', 'closed',   49800,  '$49,800'),
  (6, 1, 'VI',  '2026-04-06T20:00:00+02:00', '20:00', 'closed',   61300,  '$61,300'),
  (7, 1, 'VII', '2026-04-11T20:00:00+02:00', '20:00', 'live',    104402, '$104,402'),
  (8, 1, 'VIII','2026-04-17T19:00:00+02:00', '19:00', 'open',      NULL,  'TBD'),
  (9, 1, 'IX',  '2026-04-22T20:00:00+02:00', '20:00', 'upcoming',  NULL,  'TBD'),
  (10,1, 'X',   '2026-04-28T19:30:00+02:00', '19:30', 'upcoming',  NULL,  'TBD'),
  (11,1, 'XI',  '2026-05-05T19:00:00+02:00', '19:00', 'upcoming',  NULL,  'TBD'),
  (12,1, 'XII', '2026-05-12T20:00:00+02:00', '20:00', 'upcoming',  NULL,  'TBD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO session_participant (session_id, player_id, player_order, status, odds, amount_bet, endurance, survival_rate, agility, is_mvp)
VALUES
  (7, 1, 1, 'active', 1.48, 43212, 95, 83, 68, TRUE),
  (7, 2, 2, 'active', 2.10, 28890, 63, 72, 92, FALSE),
  (7, 3, 3, 'active', 3.40, 15100, 47, 65, 54, FALSE),
  (7, 4, 4, 'active', 4.20,  9440, 38, 61, 84, FALSE),
  (7, 5, 5, 'active', 5.10,  7760, 28, 55, 41, FALSE)
ON CONFLICT (session_id, player_id) DO NOTHING;

INSERT INTO elimination_event (session_id, player_id, player_label, eliminated_at_seconds, round_no)
VALUES
  (7, NULL, 'K. OSEI', 134, 3),
  (7, NULL, 'M. CHEN', 107, 3),
  (7, NULL, 'P. RIOS', 55, 3)
ON CONFLICT DO NOTHING;

INSERT INTO position_snapshot (session_id, player_id, x, y, captured_at, source)
VALUES
  (7, 1, 148, 138, '2026-04-11T20:02:00+02:00', 'seed'),
  (7, 2, 220, 155, '2026-04-11T20:02:00+02:00', 'seed'),
  (7, 3, 182, 252, '2026-04-11T20:02:00+02:00', 'seed'),
  (7, 4, 118, 210, '2026-04-11T20:02:00+02:00', 'seed'),
  (7, 5, 240, 300, '2026-04-11T20:02:00+02:00', 'seed')
ON CONFLICT DO NOTHING;
