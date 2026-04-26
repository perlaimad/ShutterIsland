import { pool } from "../config/db.js";
import { env } from "../config/env.js";

const REQUIRED_TABLES = [
  "manager",
  "player",
  "game_session",
  "session_player",
  "room",
  "session_room",
  "session_room_player",
  "elimination",
  "challenge",
  "room_challenge",
  "arena_zone",
  "arena_marker",
  "arena_obstacle",
  "environment_event",
  "live_stream",
  "viewer_access_key",
  "audit_log",
  "bet"
];

const REQUIRED_INDEXES = [
  { table: "game_session", index: "idx_session_status" },
  { table: "game_session", index: "uq_session_code" },
  { table: "session_player", index: "uq_sp_session_slot" },
  { table: "environment_event", index: "idx_evt_session_time" },
  { table: "bet", index: "idx_bet_session" },
  { table: "bet", index: "idx_bet_status" },
  { table: "viewer_access_key", index: "uq_access_key" },
  { table: "viewer_access_key", index: "idx_vak_status" }
];

const REQUIRED_CHECK_CONSTRAINTS = [
  { table: "game_session", constraint: "chk_gs_player_bounds" },
  { table: "viewer_access_key", constraint: "chk_vak_status" },
  { table: "bet", constraint: "chk_bet_amount" },
  { table: "bet", constraint: "chk_bet_settlement_time" }
];

const assertQueryCount = async (query, params, expectation, label) => {
  const [rows] = await pool.execute(query, params);
  const value = Number(rows[0]?.count ?? 0);
  if (!expectation(value)) {
    throw new Error(`${label} validation failed (count=${value}).`);
  }
  return value;
};

const assertSchemaShape = async () => {
  for (const tableName of REQUIRED_TABLES) {
    await assertQueryCount(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = ? AND table_name = ?`,
      [env.db.name, tableName],
      (count) => count === 1,
      `table:${tableName}`
    );
  }

  for (const indexSpec of REQUIRED_INDEXES) {
    await assertQueryCount(
      `SELECT COUNT(*) AS count
       FROM information_schema.statistics
       WHERE table_schema = ?
         AND table_name = ?
         AND index_name = ?`,
      [env.db.name, indexSpec.table, indexSpec.index],
      (count) => count >= 1,
      `index:${indexSpec.table}.${indexSpec.index}`
    );
  }

  for (const checkSpec of REQUIRED_CHECK_CONSTRAINTS) {
    await assertQueryCount(
      `SELECT COUNT(*) AS count
       FROM information_schema.check_constraints cc
       JOIN information_schema.table_constraints tc
         ON tc.constraint_schema = cc.constraint_schema
        AND tc.constraint_name = cc.constraint_name
       WHERE tc.table_schema = ?
         AND tc.table_name = ?
         AND tc.constraint_name = ?`,
      [env.db.name, checkSpec.table, checkSpec.constraint],
      (count) => count === 1,
      `constraint:${checkSpec.table}.${checkSpec.constraint}`
    );
  }
};

const assertSeedReadiness = async () => {
  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM manager WHERE role IN ('Administrator', 'Staff')",
    [],
    (count) => count >= 2,
    "seed:managers"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM game_session WHERE status IN ('Active', 'Finished')",
    [],
    (count) => count >= 1,
    "seed:sessions"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM session_player",
    [],
    (count) => count >= 1,
    "seed:session_players"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM elimination",
    [],
    (count) => count >= 1,
    "seed:eliminations"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM viewer_access_key WHERE access_status = 'Active'",
    [],
    (count) => count >= 1,
    "seed:active_viewer_keys"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM bet WHERE bet_status IN ('Pending', 'Won', 'Lost', 'Cancelled')",
    [],
    (count) => count >= 1,
    "seed:bets"
  );

  await assertQueryCount(
    "SELECT COUNT(*) AS count FROM audit_log",
    [],
    (count) => count >= 1,
    "seed:audit_logs"
  );
};

const assertRepresentativeQueries = async () => {
  await pool.execute(
    `SELECT
       session_id,
       session_code,
       status,
       started_at
     FROM game_session
     WHERE status IN ('Lobby', 'Active', 'Paused', 'Finished', 'Cancelled')
     ORDER BY COALESCE(started_at, created_at) DESC
     LIMIT 10`
  );

  await pool.execute(
    `SELECT
       b.bet_id,
       b.session_id,
       b.bet_status,
       b.bet_amount
     FROM bet b
     JOIN game_session gs ON gs.session_id = b.session_id
     ORDER BY b.placed_at DESC
     LIMIT 10`
  );

  await pool.execute(
    `SELECT
       vak.access_id,
       vak.viewer_identifier,
       vak.access_status
     FROM viewer_access_key vak
     JOIN live_stream ls ON ls.stream_id = vak.stream_id
     ORDER BY vak.issued_at DESC
     LIMIT 10`
  );
};

const run = async () => {
  try {
    await assertSchemaShape();
    await assertSeedReadiness();
    await assertRepresentativeQueries();
    console.log("Database validation successful.");
    process.exit(0);
  } catch (error) {
    console.error("Database validation failed.");
    console.error(`Host: ${env.db.host}:${env.db.port}`);
    console.error(`Database: ${env.db.name}`);
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
