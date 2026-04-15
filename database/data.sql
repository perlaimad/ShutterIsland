USE shutterisland;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE bet;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE viewer_access_key;
TRUNCATE TABLE live_stream;
TRUNCATE TABLE environment_event;
TRUNCATE TABLE room_challenge;
TRUNCATE TABLE challenge;
TRUNCATE TABLE elimination;
TRUNCATE TABLE session_room_player;
TRUNCATE TABLE session_room;
TRUNCATE TABLE session_player;
TRUNCATE TABLE room;
TRUNCATE TABLE game_session;
TRUNCATE TABLE player;
TRUNCATE TABLE manager;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 1) Managers
-- =========================
INSERT INTO manager (manager_id, username, email, password_hash, role, status, created_at, last_login_at) VALUES
(1, 'admin_nour',  'nour@shutterisland.com',  '$2b$10$hash01', 'Administrator', 'Active',    '2026-04-01 08:00:00', '2026-04-12 09:10:00'),
(2, 'admin_rami',  'rami@shutterisland.com',  '$2b$10$hash02', 'Administrator', 'Active',    '2026-04-01 08:05:00', '2026-04-12 09:20:00'),
(3, 'staff_lina',  'lina@shutterisland.com',  '$2b$10$hash03', 'Staff',         'Active',    '2026-04-01 08:10:00', '2026-04-12 08:55:00'),
(4, 'staff_omar',  'omar@shutterisland.com',  '$2b$10$hash04', 'Staff',         'Active',    '2026-04-01 08:15:00', '2026-04-12 08:40:00'),
(5, 'staff_maya',  'maya@shutterisland.com',  '$2b$10$hash05', 'Staff',         'Suspended', '2026-04-01 08:20:00', NULL);

-- =========================
-- 2) Players
-- =========================
INSERT INTO player (player_id, display_name, status, created_at) VALUES
(1,  'Adam',   'Active',   '2026-04-10 09:00:00'),
(2,  'Bella',  'Active',   '2026-04-10 09:01:00'),
(3,  'Chris',  'Active',   '2026-04-10 09:02:00'),
(4,  'Dana',   'Active',   '2026-04-10 09:03:00'),
(5,  'Eli',    'Active',   '2026-04-10 09:04:00'),
(6,  'Farah',  'Active',   '2026-04-10 09:05:00'),
(7,  'George', 'Active',   '2026-04-10 09:06:00'),
(8,  'Hana',   'Active',   '2026-04-10 09:07:00'),
(9,  'Ian',    'Active',   '2026-04-10 09:08:00'),
(10, 'Jade',   'Active',   '2026-04-10 09:09:00'),
(11, 'Karl',   'Active',   '2026-04-10 09:10:00'),
(12, 'Lara',   'Active',   '2026-04-10 09:11:00'),
(13, 'Mona',   'Active',   '2026-04-10 09:12:00'),
(14, 'Nabil',  'Active',   '2026-04-10 09:13:00'),
(15, 'Ola',    'Active',   '2026-04-10 09:14:00'),
(16, 'Paul',   'Active',   '2026-04-10 09:15:00'),
(17, 'Quinn',  'Active',   '2026-04-10 09:16:00'),
(18, 'Rana',   'Active',   '2026-04-10 09:17:00'),
(19, 'Sam',    'Active',   '2026-04-10 09:18:00'),
(20, 'Tala',   'Active',   '2026-04-10 09:19:00'),
(21, 'Umar',   'Active',   '2026-04-10 09:20:00'),
(22, 'Vera',   'Active',   '2026-04-10 09:21:00'),
(23, 'Waleed', 'Active',   '2026-04-10 09:22:00'),
(24, 'Yara',   'Active',   '2026-04-10 09:23:00'),
(25, 'Zein',   'Disabled', '2026-04-10 09:24:00');

-- =========================
-- 3) Rooms
-- =========================
INSERT INTO room (room_id, name, description, difficulty_level, sequence_order, time_limit_seconds, elimination_rule) VALUES
(1, 'Entry Gate',      'Intro room with timer activation and simple briefing challenge', 1, 1, 300, 'Failing to complete intro task before timeout causes elimination'),
(2, 'Mirror Hall',     'Puzzle corridor with reflective clues',                           2, 2, 420, 'Wrong final answer or timeout'),
(3, 'Trust Trial',     'Cooperative challenge requiring synchronized actions',            3, 3, 480, 'Insufficient team coordination'),
(4, 'Red Chamber',     'High-pressure reaction room with triggered hazards',              4, 4, 360, 'Hazard exposure or incorrect sequence'),
(5, 'Final Corridor',  'Last room before winner determination',                           5, 5, 600, 'Only one may remain to finish');

-- =========================
-- 4) Challenges
-- =========================
INSERT INTO challenge (challenge_id, title, challenge_type, description, default_duration_seconds) VALUES
(1, 'Activate Countdown', 'Timer',     'Administrator-approved timer activation', 60),
(2, 'Find the Symbol',    'Puzzle',    'Locate the hidden symbol in the room', 180),
(3, 'Mirror Sequence',    'Puzzle',    'Match reflections in the correct order', 240),
(4, 'Pressure Plate Sync','Coop',      'Two or more players must coordinate movement', 300),
(5, 'Door Code Relay',    'Logic',     'Collect clues and derive the door code', 240),
(6, 'Hazard Dodge',       'Reaction',  'Avoid triggered environmental hazards', 180),
(7, 'Final Key',          'Endgame',   'Retrieve and use the final key under pressure', 300);

-- =========================
-- 5) RoomChallenge
-- =========================
INSERT INTO room_challenge (room_id, challenge_id, order_in_room, is_mandatory, custom_duration_seconds) VALUES
(1, 1, 1, 1, 60),
(1, 2, 2, 1, 180),
(2, 3, 1, 1, 240),
(3, 4, 1, 1, 300),
(3, 5, 2, 1, 240),
(4, 6, 1, 1, 180),
(5, 7, 1, 1, 300);

-- =========================
-- 6) Game Sessions
-- =========================
INSERT INTO game_session (
  session_id, session_code, created_by_manager_id, min_players, max_players, status,
  created_at, started_at, ended_at
) VALUES
(1, 'SES-101', 1, 3, 5, 'Finished',  '2026-04-11 09:00:00', '2026-04-11 10:00:00', '2026-04-11 11:10:00'),
(2, 'SES-102', 1, 3, 5, 'Active',    '2026-04-12 08:00:00', '2026-04-12 09:00:00', NULL),
(3, 'SES-103', 2, 2, 4, 'Lobby',     '2026-04-12 10:15:00', NULL, NULL),
(4, 'SES-104', 2, 3, 5, 'Paused',    '2026-04-12 07:30:00', '2026-04-12 08:15:00', NULL),
(5, 'SES-105', 1, 2, 3, 'Cancelled', '2026-04-10 14:00:00', NULL, NULL);

-- =========================
-- 7) Session Players
-- =========================
INSERT INTO session_player (session_id, player_id, slot_number, joined_at, is_alive, eliminated_at, final_rank) VALUES
-- Session 1 Finished
(1, 1, 1, '2026-04-11 09:50:00', 0, '2026-04-11 10:20:00', 4),
(1, 2, 2, '2026-04-11 09:50:10', 0, '2026-04-11 10:35:00', 3),
(1, 3, 3, '2026-04-11 09:50:20', 0, '2026-04-11 10:50:00', 2),
(1, 4, 4, '2026-04-11 09:50:30', 1, NULL,                   1),

-- Session 2 Active
(2, 5, 1, '2026-04-12 08:50:00', 1, NULL, NULL),
(2, 6, 2, '2026-04-12 08:50:10', 1, NULL, NULL),
(2, 7, 3, '2026-04-12 08:50:20', 0, '2026-04-12 09:18:00', NULL),
(2, 8, 4, '2026-04-12 08:50:30', 1, NULL, NULL),
(2, 9, 5, '2026-04-12 08:50:40', 1, NULL, NULL),

-- Session 3 Lobby
(3, 10, 1, '2026-04-12 10:20:00', 1, NULL, NULL),
(3, 11, 2, '2026-04-12 10:20:05', 1, NULL, NULL),
(3, 12, 3, '2026-04-12 10:20:10', 1, NULL, NULL),

-- Session 4 Paused
(4, 13, 1, '2026-04-12 08:00:00', 1, NULL, NULL),
(4, 14, 2, '2026-04-12 08:00:05', 0, '2026-04-12 08:40:00', NULL),
(4, 15, 3, '2026-04-12 08:00:10', 1, NULL, NULL),
(4, 16, 4, '2026-04-12 08:00:15', 1, NULL, NULL),

-- Session 5 Cancelled
(5, 17, 1, '2026-04-10 14:05:00', 1, NULL, NULL),
(5, 18, 2, '2026-04-10 14:05:05', 1, NULL, NULL);

-- =========================
-- 8) Session Rooms
-- =========================
INSERT INTO session_room (
  session_room_id, session_id, room_id, room_index, status, started_at, ended_at,
  min_eliminations_to_unlock, unlocked_next_room_at
) VALUES
-- Session 1
(1,  1, 1, 1, 'Completed', '2026-04-11 10:00:00', '2026-04-11 10:10:00', 1, '2026-04-11 10:10:05'),
(2,  1, 2, 2, 'Completed', '2026-04-11 10:10:10', '2026-04-11 10:28:00', 1, '2026-04-11 10:28:10'),
(3,  1, 3, 3, 'Completed', '2026-04-11 10:28:15', '2026-04-11 10:45:00', 1, '2026-04-11 10:45:10'),
(4,  1, 4, 4, 'Completed', '2026-04-11 10:45:15', '2026-04-11 11:00:00', 1, '2026-04-11 11:00:10'),
(5,  1, 5, 5, 'Completed', '2026-04-11 11:00:15', '2026-04-11 11:10:00', 1, NULL),

-- Session 2
(6,  2, 1, 1, 'Completed', '2026-04-12 09:00:00', '2026-04-12 09:10:00', 1, '2026-04-12 09:10:05'),
(7,  2, 2, 2, 'Active',    '2026-04-12 09:10:10', NULL,                   1, NULL),
(8,  2, 3, 3, 'Locked',    NULL,                  NULL,                   1, NULL),

-- Session 3
(9,  3, 1, 1, 'Pending',   NULL,                  NULL,                   1, NULL),
(10, 3, 2, 2, 'Locked',    NULL,                  NULL,                   1, NULL),

-- Session 4
(11, 4, 1, 1, 'Completed', '2026-04-12 08:15:00', '2026-04-12 08:25:00', 1, '2026-04-12 08:25:05'),
(12, 4, 2, 2, 'Completed', '2026-04-12 08:25:10', '2026-04-12 08:45:00', 1, '2026-04-12 08:45:05'),
(13, 4, 3, 3, 'Active',    '2026-04-12 08:45:10', NULL,                   1, NULL),

-- Session 5
(14, 5, 1, 1, 'Failed',    NULL,                  NULL,                   1, NULL);

-- =========================
-- 9) Session Room Players
-- =========================
INSERT INTO session_room_player (session_room_id, player_id, entered_at, status) VALUES
-- Session 1, Room 1
(1, 1, '2026-04-11 10:00:00', 'EliminatedInThisRoom'),
(1, 2, '2026-04-11 10:00:00', 'SurvivedRoom'),
(1, 3, '2026-04-11 10:00:00', 'SurvivedRoom'),
(1, 4, '2026-04-11 10:00:00', 'SurvivedRoom'),

-- Session 1, Room 2
(2, 2, '2026-04-11 10:10:10', 'EliminatedInThisRoom'),
(2, 3, '2026-04-11 10:10:10', 'SurvivedRoom'),
(2, 4, '2026-04-11 10:10:10', 'SurvivedRoom'),

-- Session 1, Room 3
(3, 3, '2026-04-11 10:28:15', 'SurvivedRoom'),
(3, 4, '2026-04-11 10:28:15', 'SurvivedRoom'),

-- Session 1, Room 4
(4, 3, '2026-04-11 10:45:15', 'EliminatedInThisRoom'),
(4, 4, '2026-04-11 10:45:15', 'SurvivedRoom'),

-- Session 1, Room 5
(5, 4, '2026-04-11 11:00:15', 'SurvivedRoom'),

-- Session 2, Room 1
(6, 5, '2026-04-12 09:00:00', 'SurvivedRoom'),
(6, 6, '2026-04-12 09:00:00', 'SurvivedRoom'),
(6, 7, '2026-04-12 09:00:00', 'EliminatedInThisRoom'),
(6, 8, '2026-04-12 09:00:00', 'SurvivedRoom'),
(6, 9, '2026-04-12 09:00:00', 'SurvivedRoom'),

-- Session 2, Room 2
(7, 5, '2026-04-12 09:10:10', 'Active'),
(7, 6, '2026-04-12 09:10:10', 'Active'),
(7, 8, '2026-04-12 09:10:10', 'Active'),
(7, 9, '2026-04-12 09:10:10', 'Active'),

-- Session 3, Room 1
(9, 10, '2026-04-12 10:25:00', 'Active'),
(9, 11, '2026-04-12 10:25:00', 'Active'),
(9, 12, '2026-04-12 10:25:00', 'Active'),

-- Session 4, Room 1
(11, 13, '2026-04-12 08:15:00', 'SurvivedRoom'),
(11, 14, '2026-04-12 08:15:00', 'SurvivedRoom'),
(11, 15, '2026-04-12 08:15:00', 'SurvivedRoom'),
(11, 16, '2026-04-12 08:15:00', 'SurvivedRoom'),

-- Session 4, Room 2
(12, 13, '2026-04-12 08:25:10', 'SurvivedRoom'),
(12, 14, '2026-04-12 08:25:10', 'EliminatedInThisRoom'),
(12, 15, '2026-04-12 08:25:10', 'SurvivedRoom'),
(12, 16, '2026-04-12 08:25:10', 'SurvivedRoom'),

-- Session 4, Room 3
(13, 13, '2026-04-12 08:45:10', 'Active'),
(13, 15, '2026-04-12 08:45:10', 'Active'),
(13, 16, '2026-04-12 08:45:10', 'Active');

-- =========================
-- 10) Eliminations
-- =========================
INSERT INTO elimination (elimination_id, session_id, session_room_id, player_id, reason, ts) VALUES
(1, 1, 1, 1,  'Timed out in Entry Gate', '2026-04-11 10:20:00'),
(2, 1, 2, 2,  'Wrong answer in Mirror Hall', '2026-04-11 10:35:00'),
(3, 1, 4, 3,  'Failed hazard sequence in Red Chamber', '2026-04-11 10:50:00'),
(4, 2, 6, 7,  'Missed unlock condition in Entry Gate', '2026-04-12 09:18:00'),
(5, 4, 12, 14, 'Failed cooperative sync in Mirror Hall', '2026-04-12 08:40:00');

-- =========================
-- 11) Environment Events
-- =========================
INSERT INTO environment_event (
  event_id, session_id, session_room_id, event_type, payload_json, triggered_by, triggered_by_manager_id, created_at
) VALUES
(1, 1, 1, 'SessionStarted', JSON_OBJECT('note', 'Session timer initiated'), 'Manager', 1, '2026-04-11 10:00:00'),
(2, 1, 1, 'CountdownActivated', JSON_OBJECT('seconds', 300), 'System', NULL, '2026-04-11 10:00:05'),
(3, 1, 1, 'PlayerEliminated', JSON_OBJECT('player_id', 1, 'reason', 'timeout'), 'Manager', 1, '2026-04-11 10:20:00'),
(4, 1, 2, 'DoorUnlocked', JSON_OBJECT('next_room_index', 2), 'System', NULL, '2026-04-11 10:10:05'),
(5, 1, 2, 'MirrorPuzzleCompleted', JSON_OBJECT('team_size', 3), 'System', NULL, '2026-04-11 10:28:00'),
(6, 1, 4, 'HazardTriggered', JSON_OBJECT('hazard', 'red_lights'), 'System', NULL, '2026-04-11 10:47:00'),
(7, 2, 6, 'SessionStarted', JSON_OBJECT('note', 'Monitoring live'), 'Manager', 1, '2026-04-12 09:00:00'),
(8, 2, 6, 'RoomCompleted', JSON_OBJECT('room_index', 1), 'System', NULL, '2026-04-12 09:10:00'),
(9, 2, 7, 'PlayerEliminated', JSON_OBJECT('player_id', 7, 'reason', 'late_input'), 'Manager', 3, '2026-04-12 09:18:00'),
(10, 2, 7, 'LevelProgressionUpdate', JSON_OBJECT('current_room', 2, 'remaining_players', 4), 'System', NULL, '2026-04-12 09:19:00'),
(11, 4, 11, 'SessionStarted', JSON_OBJECT('note', 'Paused session test'), 'Manager', 2, '2026-04-12 08:15:00'),
(12, 4, 12, 'SessionPaused', JSON_OBJECT('reason', 'manual pause for safety check'), 'Manager', 2, '2026-04-12 08:50:00');

-- =========================
-- 12) Live Streams
-- =========================
INSERT INTO live_stream (
  stream_id, session_id, stream_status, stream_url, encryption_mode, started_at, ended_at, created_at
) VALUES
(1, 1, 'Ended',   'https://stream.example.com/ses101', 'AES256', '2026-04-11 10:00:00', '2026-04-11 11:10:00', '2026-04-11 09:58:00'),
(2, 2, 'Live',    'https://stream.example.com/ses102', 'AES256', '2026-04-12 09:00:00', NULL,                   '2026-04-12 08:58:00'),
(3, 4, 'Paused',  'https://stream.example.com/ses104', 'AES256', '2026-04-12 08:15:00', NULL,                   '2026-04-12 08:10:00');

-- =========================
-- 13) Viewer Access Keys
-- =========================
INSERT INTO viewer_access_key (
  access_id, stream_id, viewer_identifier, access_key, access_status, issued_at, expires_at, issued_by_manager_id, last_used_at
) VALUES
(1, 1, 'viewer1@example.com', 'KEY-SES101-A1', 'Expired', '2026-04-11 09:59:00', '2026-04-11 11:30:00', 1, '2026-04-11 10:30:00'),
(2, 1, 'viewer2@example.com', 'KEY-SES101-A2', 'Expired', '2026-04-11 09:59:10', '2026-04-11 11:30:00', 1, '2026-04-11 10:45:00'),
(3, 2, 'viewer3@example.com', 'KEY-SES102-B1', 'Active',  '2026-04-12 08:59:00', '2026-04-12 11:00:00', 1, '2026-04-12 09:20:00'),
(4, 2, 'viewer4@example.com', 'KEY-SES102-B2', 'Active',  '2026-04-12 08:59:05', '2026-04-12 11:00:00', 1, '2026-04-12 09:22:00'),
(5, 2, 'viewer5@example.com', 'KEY-SES102-B3', 'Revoked', '2026-04-12 08:59:10', '2026-04-12 11:00:00', 3, NULL),
(6, 3, 'viewer6@example.com', 'KEY-SES104-C1', 'Active',  '2026-04-12 08:12:00', '2026-04-12 10:30:00', 2, '2026-04-12 08:47:00');

-- =========================
-- 14) Audit Log
-- =========================
INSERT INTO audit_log (audit_id, manager_id, session_id, action_type, action_time, details_json) VALUES
(1, 1, 1, 'CREATE_SESSION',      '2026-04-11 09:00:00', JSON_OBJECT('session_code', 'SES-101')),
(2, 1, 1, 'START_SESSION',       '2026-04-11 10:00:00', JSON_OBJECT('started_by', 'admin_nour')),
(3, 1, 1, 'ELIMINATE_PLAYER',    '2026-04-11 10:20:00', JSON_OBJECT('player_id', 1)),
(4, 1, 1, 'ELIMINATE_PLAYER',    '2026-04-11 10:35:00', JSON_OBJECT('player_id', 2)),
(5, 1, 1, 'ELIMINATE_PLAYER',    '2026-04-11 10:50:00', JSON_OBJECT('player_id', 3)),
(6, 1, 1, 'FINISH_SESSION',      '2026-04-11 11:10:00', JSON_OBJECT('winner_player_id', 4)),

(7, 1, 2, 'CREATE_SESSION',      '2026-04-12 08:00:00', JSON_OBJECT('session_code', 'SES-102')),
(8, 1, 2, 'START_SESSION',       '2026-04-12 09:00:00', JSON_OBJECT('started_by', 'admin_nour')),
(9, 3, 2, 'UPDATE_PLAYER_STATUS','2026-04-12 09:18:00', JSON_OBJECT('player_id', 7, 'new_status', 'Eliminated')),
(10,3, 2, 'LOG_EVENT',           '2026-04-12 09:19:00', JSON_OBJECT('event_type', 'LevelProgressionUpdate')),

(11,2, 4, 'CREATE_SESSION',      '2026-04-12 07:30:00', JSON_OBJECT('session_code', 'SES-104')),
(12,2, 4, 'PAUSE_SESSION',       '2026-04-12 08:50:00', JSON_OBJECT('reason', 'Safety review')),

(13,1, 5, 'CANCEL_SESSION',      '2026-04-10 15:00:00', JSON_OBJECT('reason', 'Insufficient resources'));

-- =========================
-- 15) Bets
-- =========================
INSERT INTO bet (
  bet_id, session_id, stream_id, player_id, viewer_identifier, bet_type, predicted_value,
  bet_amount, actual_value, bet_status, placed_at, settled_at
) VALUES
-- Session 1 settled bets
(1, 1, 1, 4, 'viewer1@example.com', 'FinalWinner',       '4',        25.00, '4', 'Won',       '2026-04-11 10:05:00', '2026-04-11 11:10:30'),
(2, 1, 1, 1, 'viewer2@example.com', 'EliminationOrder',  '1st out',  15.00, '1st out', 'Won', '2026-04-11 10:06:00', '2026-04-11 11:10:35'),
(3, 1, 1, 3, 'viewer2@example.com', 'FinalWinner',       '3',        20.00, '4', 'Lost',      '2026-04-11 10:07:00', '2026-04-11 11:10:40'),

-- Session 2 pending bets
(4, 2, 2, 5, 'viewer3@example.com', 'SurvivalDuration',  'Longest',  30.00, NULL, 'Pending',  '2026-04-12 09:05:00', NULL),
(5, 2, 2, 6, 'viewer4@example.com', 'FinalWinner',       '6',        40.00, NULL, 'Pending',  '2026-04-12 09:07:00', NULL),
(6, 2, 2, 7, 'viewer5@example.com', 'EliminationOrder',  '1st out',  10.00, NULL, 'Pending',  '2026-04-12 09:08:00', NULL),
(7, 2, 2, NULL, 'viewer3@example.com', 'Custom',         'Room2 door unlock before 09:25', 12.50, NULL, 'Pending', '2026-04-12 09:12:00', NULL),

-- Session 4 pending/paused
(8, 4, 3, 13, 'viewer6@example.com', 'FinalWinner',      '13',       18.00, NULL, 'Pending',  '2026-04-12 08:20:00', NULL);

-- =========================
-- Extra useful queries to test with
-- =========================

-- active sessions
-- SELECT * FROM game_session WHERE status = 'Active';

-- session 2 participants with names
-- SELECT sp.session_id, p.display_name, sp.slot_number, sp.is_alive, sp.eliminated_at
-- FROM session_player sp
-- JOIN player p ON p.player_id = sp.player_id
-- WHERE sp.session_id = 2
-- ORDER BY sp.slot_number;

-- session 2 progression
-- SELECT * FROM session_room WHERE session_id = 2 ORDER BY room_index;

-- session 2 eliminations
-- SELECT e.*, p.display_name
-- FROM elimination e
-- JOIN player p ON p.player_id = e.player_id
-- WHERE e.session_id = 2
-- ORDER BY e.ts;

-- audit log
-- SELECT * FROM audit_log ORDER BY action_time DESC;