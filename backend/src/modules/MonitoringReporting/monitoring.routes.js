import { Router } from "express";
import { pool } from "../../config/db.js";

export const monitoringReportingRouter = Router();

monitoringReportingRouter.get("/admin/dashboard/overview", async (req, res) => {
  try {
    const [activeSessionsRows] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM game_session
      WHERE LOWER(status) = 'active'
    `);

    const [participantsRows] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM player
    `);

    const [completedSessionsRows] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM game_session
      WHERE LOWER(status) = 'completed'
    `);

    const [avgPlayersRows] = await pool.query(`
      SELECT AVG(player_count) AS avgPlayers
      FROM (
        SELECT session_id, COUNT(*) AS player_count
        FROM session_player
        GROUP BY session_id
      ) AS per_session
    `);

    res.json({
      activeSessions: activeSessionsRows[0].count,
      participants: participantsRows[0].count,
      completedSessions: completedSessionsRows[0].count,
      averagePlayersPerSession: Number(avgPlayersRows[0].avgPlayers || 0),
    });
  } catch (error) {
    console.error("Overview error:", error);
    res.status(500).json({
      message: "Failed to load overview data",
      error: error.message,
    });
  }
});

// GET active sessions
monitoringReportingRouter.get("/admin/dashboard/sessions", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        gs.session_id,
        gs.session_code,
        gs.status,
        r.name AS room,
        r.difficulty_level,
        COUNT(DISTINCT sp.player_id) AS participants
      FROM game_session gs
      LEFT JOIN (
        SELECT sr1.*
        FROM session_room sr1
        INNER JOIN (
          SELECT session_id, MAX(room_index) AS max_room_index
          FROM session_room
          GROUP BY session_id
        ) sr2
          ON sr1.session_id = sr2.session_id
         AND sr1.room_index = sr2.max_room_index
      ) latest_sr
        ON gs.session_id = latest_sr.session_id
      LEFT JOIN room r
        ON latest_sr.room_id = r.room_id
      LEFT JOIN session_player sp
        ON gs.session_id = sp.session_id
      GROUP BY
        gs.session_id,
        gs.session_code,
        gs.status,
        r.name,
        r.difficulty_level
      ORDER BY gs.session_id ASC
    `);

    res.json(
      rows.map((row) => ({
        id: row.session_code,
        sessionId: row.session_id,
        room: row.room || null,
        level: row.difficulty_level !== null ? `Level ${row.difficulty_level}` : null,
        participants: Number(row.participants),
        status: row.status,
      }))
    );
  } catch (error) {
    console.error("Sessions error:", error);
    res.status(500).json({
      message: "Failed to load session data",
      error: error.message,
    });
  }
});

// GET participant statuses
monitoringReportingRouter.get("/admin/dashboard/participants", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.player_id,
        p.display_name,
        p.status AS player_status,
        p.created_at,
        gs.session_code,
        sp.is_alive,
        sp.final_rank
      FROM player p
      LEFT JOIN session_player sp
        ON p.player_id = sp.player_id
      LEFT JOIN game_session gs
        ON sp.session_id = gs.session_id
      ORDER BY p.player_id ASC
    `);

    res.json(
      rows.map((row) => ({
        id: row.player_id,
        name: row.display_name,
        session: row.session_code || null,
        status: row.player_status,
        isAlive: row.is_alive === null ? null : Boolean(row.is_alive),
        finalRank: row.final_rank,
        update: row.created_at,
      }))
    );
  } catch (error) {
    console.error("Participants error:", error);
    res.status(500).json({
      message: "Failed to load participant data",
      error: error.message,
    });
  }
});

monitoringReportingRouter.get("/admin/reports/session-performance", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        gs.session_id,
        gs.session_code,
        gs.status,
        gs.created_at,
        gs.started_at,
        gs.ended_at,
        COUNT(DISTINCT sp.player_id) AS total_players,
        SUM(CASE WHEN sp.is_alive = 1 THEN 1 ELSE 0 END) AS alive_players,
        SUM(CASE WHEN sp.is_alive = 0 THEN 1 ELSE 0 END) AS eliminated_players,
        MIN(sp.final_rank) AS winning_rank
      FROM game_session gs
      LEFT JOIN session_player sp
        ON gs.session_id = sp.session_id
      GROUP BY
        gs.session_id,
        gs.session_code,
        gs.status,
        gs.created_at,
        gs.started_at,
        gs.ended_at
      ORDER BY gs.session_id ASC
    `);

    res.json(
      rows.map((row) => ({
        sessionId: row.session_id,
        sessionCode: row.session_code,
        status: row.status,
        createdAt: row.created_at,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        totalPlayers: Number(row.total_players || 0),
        alivePlayers: Number(row.alive_players || 0),
        eliminatedPlayers: Number(row.eliminated_players || 0),
        winningRank: row.winning_rank
      }))
    );
  } catch (error) {
    console.error("Session performance report error:", error);
    res.status(500).json({
      message: "Failed to load session performance report",
      error: error.message,
    });
  }
});

monitoringReportingRouter.get("/admin/reports/participant-summary", async (req, res) => {
  try {
    const [totalsRows] = await pool.query(`
      SELECT
        COUNT(*) AS totalPlayers,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) AS activePlayers,
        SUM(CASE WHEN LOWER(status) = 'disabled' THEN 1 ELSE 0 END) AS disabledPlayers
      FROM player
    `);

    const [assignmentRows] = await pool.query(`
      SELECT
        COUNT(DISTINCT sp.player_id) AS assignedPlayers
      FROM session_player sp
    `);

    const [aliveRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN sp.is_alive = 1 THEN 1 ELSE 0 END) AS alivePlayers,
        SUM(CASE WHEN sp.is_alive = 0 THEN 1 ELSE 0 END) AS eliminatedPlayers
      FROM session_player sp
    `);

    const totalPlayers = Number(totalsRows[0].totalPlayers || 0);
    const assignedPlayers = Number(assignmentRows[0].assignedPlayers || 0);

    res.json({
      totalPlayers,
      activePlayers: Number(totalsRows[0].activePlayers || 0),
      disabledPlayers: Number(totalsRows[0].disabledPlayers || 0),
      assignedPlayers,
      unassignedPlayers: totalPlayers - assignedPlayers,
      alivePlayers: Number(aliveRows[0].alivePlayers || 0),
      eliminatedPlayers: Number(aliveRows[0].eliminatedPlayers || 0),
    });
  } catch (error) {
    console.error("Participant summary report error:", error);
    res.status(500).json({
      message: "Failed to load participant summary report",
      error: error.message,
    });
  }
});