
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE DATABASE IF NOT EXISTS shutterisland CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE shutterisland;

CREATE TABLE manager (
  manager_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username       VARCHAR(64)  NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(32)  NOT NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'Active',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (manager_id),
  UNIQUE KEY uq_manager_username (username),
  UNIQUE KEY uq_manager_email (email),
  CONSTRAINT chk_manager_status CHECK (status IN ('Active','Suspended'))
) ENGINE=InnoDB;

-- =========================
-- 2) Player (no login)
-- =========================
CREATE TABLE player (
  player_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_name  VARCHAR(80) NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  KEY idx_player_status (status),
  CONSTRAINT chk_player_status CHECK (status IN ('Active','Disabled'))
) ENGINE=InnoDB;

-- =========================
-- 3) GameSession
-- =========================
CREATE TABLE game_session (
  session_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_code           VARCHAR(24) NOT NULL,
  created_by_manager_id  BIGINT UNSIGNED NOT NULL,
  manager_name           VARCHAR(120) NULL,
  min_players            INT NOT NULL,
  max_players            INT NOT NULL,
  scheduled_at           DATETIME NULL,
  visibility             VARCHAR(32) NULL,
  operator_name          VARCHAR(120) NULL,
  manager_notes          TEXT NULL,
  status                 VARCHAR(16) NOT NULL DEFAULT 'Lobby',
  created_at             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at             TIMESTAMP   NULL DEFAULT NULL,
  ended_at               TIMESTAMP   NULL DEFAULT NULL,
  timer_status           VARCHAR(24) NOT NULL DEFAULT 'not_started',
  timer_duration_seconds INT NULL,
  timer_started_at       DATETIME NULL,
  timer_paused_at        DATETIME NULL,
  timer_elapsed_before_pause_seconds INT NOT NULL DEFAULT 0,

  PRIMARY KEY (session_id),
  UNIQUE KEY uq_session_code (session_code),
  KEY idx_session_manager (created_by_manager_id),
  KEY idx_session_status (status),
  KEY idx_session_timer_status (timer_status),

  CONSTRAINT fk_session_manager
    FOREIGN KEY (created_by_manager_id) REFERENCES manager(manager_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_session_player_bounds CHECK (max_players >= min_players),
  CONSTRAINT chk_session_max_range CHECK (max_players BETWEEN 1 AND 7),
  CONSTRAINT chk_session_status CHECK (status IN ('Lobby','Active','Paused','Finished','Cancelled')),
  CONSTRAINT chk_session_times CHECK (
    (started_at IS NULL OR started_at >= created_at)
    AND (ended_at IS NULL OR started_at IS NULL OR ended_at > started_at)
  )
) ENGINE=InnoDB;

-- =========================
-- 4) SessionPlayer (session-wide alive/out)
-- =========================
CREATE TABLE session_player (
  session_id     BIGINT UNSIGNED NOT NULL,
  player_id      BIGINT UNSIGNED NOT NULL,
  slot_number    INT NOT NULL,
  joined_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_alive       TINYINT(1) NOT NULL DEFAULT 1,
  eliminated_at  TIMESTAMP NULL DEFAULT NULL,
  final_rank     INT NULL DEFAULT NULL,

  PRIMARY KEY (session_id, player_id),
  UNIQUE KEY uq_session_slot (session_id, slot_number),
  KEY idx_sp_player (player_id),
  KEY idx_sp_alive (session_id, is_alive),

  CONSTRAINT fk_sp_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_sp_player
    FOREIGN KEY (player_id) REFERENCES player(player_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_sp_slot CHECK (slot_number BETWEEN 1 AND 7),
  CONSTRAINT chk_sp_final_rank CHECK (final_rank IS NULL OR final_rank >= 1)
) ENGINE=InnoDB;

-- =========================
-- 5) Room (template)
-- =========================
CREATE TABLE room (
  room_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                VARCHAR(120) NOT NULL,
  description         TEXT NULL,
  difficulty_level    INT NOT NULL DEFAULT 1,
  sequence_order      INT NULL DEFAULT NULL,
  time_limit_seconds  INT NULL DEFAULT NULL,
  elimination_rule    TEXT NULL,

  PRIMARY KEY (room_id),
  UNIQUE KEY uq_room_name (name),
  KEY idx_room_seq (sequence_order),

  CONSTRAINT chk_room_difficulty CHECK (difficulty_level >= 1),
  CONSTRAINT chk_room_time_limit CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  CONSTRAINT chk_room_seq CHECK (sequence_order IS NULL OR sequence_order >= 1)
) ENGINE=InnoDB;

-- =========================
-- 6) SessionRoom (room instance per session)
-- =========================
CREATE TABLE session_room (
  session_room_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id                 BIGINT UNSIGNED NOT NULL,
  room_id                    BIGINT UNSIGNED NOT NULL,
  room_index                 INT NOT NULL,
  status                     VARCHAR(16) NOT NULL DEFAULT 'Pending',
  started_at                 TIMESTAMP NULL DEFAULT NULL,
  ended_at                   TIMESTAMP NULL DEFAULT NULL,
  min_eliminations_to_unlock INT NOT NULL DEFAULT 1,
  unlocked_next_room_at      TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (session_room_id),
  UNIQUE KEY uq_session_room_index (session_id, room_index),
  KEY idx_sr_session (session_id),
  KEY idx_sr_room (room_id),
  KEY idx_sr_status (status),

  CONSTRAINT fk_sr_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_sr_room
    FOREIGN KEY (room_id) REFERENCES room(room_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_sr_index CHECK (room_index >= 1),
  CONSTRAINT chk_sr_status CHECK (status IN ('Pending','Active','Completed','Failed','Locked')),
  CONSTRAINT chk_sr_min_elims CHECK (min_eliminations_to_unlock >= 1),
  CONSTRAINT chk_sr_times CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at > started_at)
) ENGINE=InnoDB;

-- =========================
-- 7) SessionRoomPlayer (who reached each room)
-- =========================
CREATE TABLE session_room_player (
  session_room_id  BIGINT UNSIGNED NOT NULL,
  player_id        BIGINT UNSIGNED NOT NULL,
  entered_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status           VARCHAR(24) NOT NULL DEFAULT 'Active',

  PRIMARY KEY (session_room_id, player_id),
  KEY idx_srp_player (player_id),
  KEY idx_srp_status (status),

  CONSTRAINT fk_srp_session_room
    FOREIGN KEY (session_room_id) REFERENCES session_room(session_room_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_srp_player
    FOREIGN KEY (player_id) REFERENCES player(player_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_srp_status CHECK (status IN ('Active','EliminatedInThisRoom','SurvivedRoom'))
) ENGINE=InnoDB;

-- =========================
-- 8) Elimination (one per player per session)
-- =========================
CREATE TABLE elimination (
  elimination_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id       BIGINT UNSIGNED NOT NULL,
  session_room_id  BIGINT UNSIGNED NOT NULL,
  player_id        BIGINT UNSIGNED NOT NULL,
  reason           VARCHAR(80) NOT NULL,
  ts               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (elimination_id),
  UNIQUE KEY uq_elim_one_per_session (session_id, player_id),
  KEY idx_elim_room (session_room_id),
  KEY idx_elim_player (player_id),

  CONSTRAINT fk_elim_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_elim_session_room
    FOREIGN KEY (session_room_id) REFERENCES session_room(session_room_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_elim_player
    FOREIGN KEY (player_id) REFERENCES player(player_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 9) Challenge (template)
-- =========================
CREATE TABLE challenge (
  challenge_id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title                     VARCHAR(120) NOT NULL,
  challenge_type            VARCHAR(32) NOT NULL,
  description               TEXT NULL,
  default_duration_seconds  INT NULL DEFAULT NULL,

  PRIMARY KEY (challenge_id),
  KEY idx_challenge_type (challenge_type),

  CONSTRAINT chk_challenge_duration CHECK (default_duration_seconds IS NULL OR default_duration_seconds > 0)
) ENGINE=InnoDB;

-- =========================
-- 10) RoomChallenge (room ↔ challenge mapping)
-- =========================
CREATE TABLE room_challenge (
  room_id                 BIGINT UNSIGNED NOT NULL,
  challenge_id            BIGINT UNSIGNED NOT NULL,
  order_in_room           INT NOT NULL,
  is_mandatory            TINYINT(1) NOT NULL DEFAULT 1,
  custom_duration_seconds INT NULL DEFAULT NULL,

  PRIMARY KEY (room_id, challenge_id),
  UNIQUE KEY uq_room_order (room_id, order_in_room),
  KEY idx_rc_challenge (challenge_id),

  CONSTRAINT fk_rc_room
    FOREIGN KEY (room_id) REFERENCES room(room_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_rc_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenge(challenge_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_rc_order CHECK (order_in_room >= 1),
  CONSTRAINT chk_rc_custom_duration CHECK (custom_duration_seconds IS NULL OR custom_duration_seconds > 0)
) ENGINE=InnoDB;

-- =========================
-- 11) EnvironmentEvent (sync events)
-- =========================
CREATE TABLE environment_event (
  event_id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id               BIGINT UNSIGNED NOT NULL,
  session_room_id          BIGINT UNSIGNED NULL DEFAULT NULL,
  event_type               VARCHAR(64) NOT NULL,
  payload_json             JSON NOT NULL,
  triggered_by             VARCHAR(16) NOT NULL, -- 'System' or 'Manager'
  triggered_by_manager_id  BIGINT UNSIGNED NULL DEFAULT NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (event_id),
  KEY idx_ev_session_time (session_id, created_at),
  KEY idx_ev_room (session_room_id),
  KEY idx_ev_trigger_mgr (triggered_by_manager_id),

  CONSTRAINT fk_ev_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_ev_session_room
    FOREIGN KEY (session_room_id) REFERENCES session_room(session_room_id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_ev_manager
    FOREIGN KEY (triggered_by_manager_id) REFERENCES manager(manager_id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_ev_triggered_by CHECK (triggered_by IN ('System','Manager'))
) ENGINE=InnoDB;

-- =========================
-- 12) LiveStream (one per session)
-- =========================
CREATE TABLE live_stream (
  stream_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id       BIGINT UNSIGNED NOT NULL,
  stream_status    VARCHAR(16) NOT NULL DEFAULT 'Offline',
  stream_url       TEXT NOT NULL,
  encryption_mode  VARCHAR(32) NOT NULL,
  started_at       TIMESTAMP NULL DEFAULT NULL,
  ended_at         TIMESTAMP NULL DEFAULT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (stream_id),
  UNIQUE KEY uq_stream_session (session_id),
  KEY idx_stream_status (stream_status),

  CONSTRAINT fk_stream_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT chk_stream_status CHECK (stream_status IN ('Offline','Live','Paused','Ended')),
  CONSTRAINT chk_stream_times CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at > started_at)
) ENGINE=InnoDB;

-- =========================
-- 13) ViewerAccessKey (paywall key)
-- =========================
CREATE TABLE viewer_access_key (
  access_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stream_id             BIGINT UNSIGNED NOT NULL,
  viewer_identifier     VARCHAR(255) NOT NULL, -- email/username/etc.
  access_key            VARCHAR(120) NOT NULL,
  access_status         VARCHAR(16) NOT NULL DEFAULT 'Active',
  issued_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at            TIMESTAMP NULL DEFAULT NULL,
  issued_by_manager_id  BIGINT UNSIGNED NULL DEFAULT NULL,
  last_used_at          TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (access_id),
  UNIQUE KEY uq_access_key (access_key),
  UNIQUE KEY uq_stream_viewer (stream_id, viewer_identifier),
  KEY idx_vak_status (access_status),
  KEY idx_vak_mgr (issued_by_manager_id),

  CONSTRAINT fk_vak_stream
    FOREIGN KEY (stream_id) REFERENCES live_stream(stream_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_vak_manager
    FOREIGN KEY (issued_by_manager_id) REFERENCES manager(manager_id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_vak_status CHECK (access_status IN ('Active','Revoked','Expired')),
  CONSTRAINT chk_vak_expiry CHECK (expires_at IS NULL OR expires_at > issued_at)
) ENGINE=InnoDB;

-- =========================
-- 14) AuditLog (admin actions)
-- =========================
CREATE TABLE audit_log (
  audit_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  manager_id    BIGINT UNSIGNED NOT NULL,
  session_id    BIGINT UNSIGNED NULL DEFAULT NULL,
  action_type   VARCHAR(64) NOT NULL,
  action_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details_json  JSON NOT NULL,

  PRIMARY KEY (audit_id),
  KEY idx_audit_mgr_time (manager_id, action_time),
  KEY idx_audit_session (session_id),

  CONSTRAINT fk_audit_manager
    FOREIGN KEY (manager_id) REFERENCES manager(manager_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_audit_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;



CREATE TABLE bet (
  bet_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id        BIGINT UNSIGNED NOT NULL,
  stream_id         BIGINT UNSIGNED NOT NULL,
  player_id         BIGINT UNSIGNED NULL DEFAULT NULL,
  viewer_identifier VARCHAR(255) NOT NULL,
  bet_type          ENUM(
                        'SurvivalDuration',
                        'EliminationOrder',
                        'FinalWinner',
                        'RoomSurvival',
                        'Custom'
                     ) NOT NULL,
  predicted_value   VARCHAR(255) NOT NULL,
  bet_amount        DECIMAL(10,2) NOT NULL,
  actual_value      VARCHAR(255) NULL DEFAULT NULL,
  bet_status        ENUM('Pending','Won','Lost','Cancelled')
                     NOT NULL DEFAULT 'Pending',
  placed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at        TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (bet_id),
  KEY idx_bet_session (session_id),
  KEY idx_bet_stream (stream_id),
  KEY idx_bet_player (player_id),
  KEY idx_bet_status (bet_status),

  CONSTRAINT fk_bet_session
    FOREIGN KEY (session_id)
    REFERENCES game_session(session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_bet_stream
    FOREIGN KEY (stream_id)
    REFERENCES live_stream(stream_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_bet_player
    FOREIGN KEY (player_id)
    REFERENCES player(player_id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_bet_amount
    CHECK (bet_amount > 0),
  CONSTRAINT chk_bet_settlement_time
    CHECK (settled_at IS NULL OR settled_at >= placed_at)
) ENGINE=InnoDB;
