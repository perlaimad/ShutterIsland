-- 002_create_session_live.sql
-- Session lifecycle, betting, live positions, and elimination logs.

CREATE TABLE IF NOT EXISTS arena_session (
  id BIGSERIAL PRIMARY KEY,
  arena_id BIGINT NOT NULL REFERENCES arena(id) ON DELETE RESTRICT,
  roman_id VARCHAR(16) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  local_time_label VARCHAR(16),
  status VARCHAR(24) NOT NULL,
  pool_amount NUMERIC(12,2),
  pool_label VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, roman_id)
);

CREATE TABLE IF NOT EXISTS session_participant (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES arena_session(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES player(id) ON DELETE RESTRICT,
  player_order SMALLINT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  odds NUMERIC(8,2),
  amount_bet NUMERIC(12,2),
  endurance SMALLINT,
  survival_rate SMALLINT,
  agility SMALLINT,
  is_mvp BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id),
  UNIQUE (session_id, player_order)
);

CREATE TABLE IF NOT EXISTS elimination_event (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES arena_session(id) ON DELETE CASCADE,
  player_id BIGINT REFERENCES player(id) ON DELETE SET NULL,
  player_label VARCHAR(128) NOT NULL,
  eliminated_at_seconds INTEGER NOT NULL,
  round_no SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS position_snapshot (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES arena_session(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  x NUMERIC(10,3) NOT NULL,
  y NUMERIC(10,3) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'seed'
);

CREATE INDEX IF NOT EXISTS idx_arena_session_starts_at ON arena_session (starts_at);
CREATE INDEX IF NOT EXISTS idx_arena_session_status ON arena_session (status);
CREATE INDEX IF NOT EXISTS idx_session_participant_session_id ON session_participant (session_id);
CREATE INDEX IF NOT EXISTS idx_elimination_event_session_id ON elimination_event (session_id);
CREATE INDEX IF NOT EXISTS idx_position_snapshot_session_time ON position_snapshot (session_id, captured_at);
