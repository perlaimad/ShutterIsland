-- 001_create_arena_core.sql
-- Core entities for arena geometry, players, and static metadata.

CREATE TABLE IF NOT EXISTS arena (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  map_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  initials VARCHAR(8) NOT NULL,
  role VARCHAR(32) NOT NULL,
  primary_color VARCHAR(16),
  avatar_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_zone (
  id BIGSERIAL PRIMARY KEY,
  arena_id BIGINT NOT NULL REFERENCES arena(id) ON DELETE CASCADE,
  zone_code VARCHAR(32) NOT NULL,
  label VARCHAR(128) NOT NULL,
  shape_type VARCHAR(24) NOT NULL,
  shape_json JSONB NOT NULL,
  risk_level SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, zone_code)
);

CREATE TABLE IF NOT EXISTS arena_obstacle (
  id BIGSERIAL PRIMARY KEY,
  arena_id BIGINT NOT NULL REFERENCES arena(id) ON DELETE CASCADE,
  obstacle_code VARCHAR(32) NOT NULL,
  label VARCHAR(128) NOT NULL,
  x NUMERIC(10,3) NOT NULL,
  y NUMERIC(10,3) NOT NULL,
  width NUMERIC(10,3) NOT NULL,
  height NUMERIC(10,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, obstacle_code)
);

CREATE TABLE IF NOT EXISTS arena_marker (
  id BIGSERIAL PRIMARY KEY,
  arena_id BIGINT NOT NULL REFERENCES arena(id) ON DELETE CASCADE,
  marker_code VARCHAR(32) NOT NULL,
  label VARCHAR(128) NOT NULL,
  x NUMERIC(10,3) NOT NULL,
  y NUMERIC(10,3) NOT NULL,
  color VARCHAR(16),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, marker_code)
);

CREATE INDEX IF NOT EXISTS idx_arena_marker_arena_id ON arena_marker (arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_obstacle_arena_id ON arena_obstacle (arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_zone_arena_id ON arena_zone (arena_id);
