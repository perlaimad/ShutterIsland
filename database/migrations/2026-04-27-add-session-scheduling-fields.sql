ALTER TABLE game_session
  ADD COLUMN IF NOT EXISTS manager_name VARCHAR(120) NULL AFTER created_by_manager_id,
  ADD COLUMN IF NOT EXISTS scheduled_at DATETIME NULL AFTER max_players,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(32) NULL AFTER scheduled_at,
  ADD COLUMN IF NOT EXISTS operator_name VARCHAR(120) NULL AFTER visibility,
  ADD COLUMN IF NOT EXISTS manager_notes TEXT NULL AFTER operator_name;
