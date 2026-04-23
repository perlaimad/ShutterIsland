import { Router } from "express";
import { pool } from "../../config/db.js";
import { publishAdminEvent, subscribeAdminStream } from "../../common/realtime/sse.js";

export const monitoringReportingRouter = Router();

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const findSessionByIdentifier = async (connection, identifier) => {
  const numericId = asPositiveInteger(identifier);
  const [rows] = await connection.execute(
    `SELECT
       session_id,
       session_code,
       status,
       created_at,
       started_at,
       ended_at
     FROM game_session
     WHERE session_id = ? OR LOWER(session_code) = LOWER(?)
     LIMIT 1`,
    [numericId ?? 0, String(identifier || "").trim()]
  );

  return rows[0] ?? null;
};

const getElapsedSeconds = (startedAt, eventAt) => {
  if (!startedAt || !eventAt) {
    return null;
  }

  const start = new Date(startedAt);
  const eventTime = new Date(eventAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(eventTime.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((eventTime - start) / 1000));
};

monitoringReportingRouter.get("/admin/stream", (req, res) => {
  subscribeAdminStream(req, res);
});

monitoringReportingRouter.get("/sessions/:sessionIdentifier/eliminations", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const session = await findSessionByIdentifier(connection, req.params.sessionIdentifier);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    const [rows] = await connection.execute(
      `SELECT
         e.elimination_id,
         e.player_id,
         e.reason,
         e.ts,
         p.display_name,
         sr.session_room_id,
         sr.room_index,
         r.room_id,
         r.name AS room_name
       FROM elimination e
       JOIN player p
         ON p.player_id = e.player_id
       JOIN session_room sr
         ON sr.session_room_id = e.session_room_id
       JOIN room r
         ON r.room_id = sr.room_id
       WHERE e.session_id = ?
       ORDER BY e.ts DESC, e.elimination_id DESC`,
      [session.session_id]
    );

    return res.json({
      session: {
        sessionId: Number(session.session_id),
        id: session.session_code,
        status: String(session.status || "").toLowerCase(),
        startsAt: toIsoString(session.started_at ?? session.created_at),
        endedAt: toIsoString(session.ended_at),
      },
      eliminations: rows.map((row) => ({
        eliminationId: Number(row.elimination_id),
        playerId: Number(row.player_id),
        playerName: row.display_name,
        room: {
          sessionRoomId: Number(row.session_room_id),
          roomId: Number(row.room_id),
          roomIndex: Number(row.room_index),
          roomName: row.room_name,
        },
        reason: row.reason,
        eliminatedAt: toIsoString(row.ts),
        eliminatedAtSeconds: getElapsedSeconds(session.started_at, row.ts),
      })),
    });
  } catch (error) {
    console.error("Eliminations error:", error);
    return res.status(500).json({
      message: "Failed to load elimination feed",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

monitoringReportingRouter.get("/sessions/:sessionIdentifier/positions/latest", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const session = await findSessionByIdentifier(connection, req.params.sessionIdentifier);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    const [rows] = await connection.execute(
      `SELECT
         sp.player_id,
         p.display_name,
         sp.slot_number,
         sp.joined_at,
         latest_srp.entered_at,
         latest_srp.status AS room_player_status,
         sr.session_room_id,
         sr.room_index,
         sr.status AS room_status,
         r.room_id,
         r.name AS room_name,
         r.difficulty_level
       FROM session_player sp
       JOIN player p
         ON p.player_id = sp.player_id
       LEFT JOIN (
         SELECT srp1.session_room_id, srp1.player_id, srp1.entered_at, srp1.status
         FROM session_room_player srp1
         INNER JOIN (
           SELECT
             srp.player_id,
             MAX(CONCAT(
               DATE_FORMAT(srp.entered_at, '%Y%m%d%H%i%s'),
               LPAD(srp.session_room_id, 10, '0')
             )) AS latest_marker
           FROM session_room_player srp
           JOIN session_room sr
             ON sr.session_room_id = srp.session_room_id
           WHERE sr.session_id = ?
           GROUP BY srp.player_id
         ) latest
           ON latest.player_id = srp1.player_id
          AND CONCAT(
            DATE_FORMAT(srp1.entered_at, '%Y%m%d%H%i%s'),
            LPAD(srp1.session_room_id, 10, '0')
          ) = latest.latest_marker
       ) latest_srp
         ON latest_srp.player_id = sp.player_id
       LEFT JOIN session_room sr
         ON sr.session_room_id = latest_srp.session_room_id
       LEFT JOIN room r
         ON r.room_id = sr.room_id
       WHERE sp.session_id = ?
         AND sp.is_alive = 1
       ORDER BY COALESCE(sr.room_index, 0) DESC, sp.slot_number ASC, sp.player_id ASC`,
      [session.session_id, session.session_id]
    );

    return res.json({
      session: {
        sessionId: Number(session.session_id),
        id: session.session_code,
        status: String(session.status || "").toLowerCase(),
        startsAt: toIsoString(session.started_at ?? session.created_at),
        endedAt: toIsoString(session.ended_at),
      },
      positions: rows.map((row, index) => ({
        snapshotId: `session-${session.session_id}-player-${row.player_id}`,
        playerId: Number(row.player_id),
        playerName: row.display_name,
        slotNumber: Number(row.slot_number),
        room: row.session_room_id ? {
          sessionRoomId: Number(row.session_room_id),
          roomId: Number(row.room_id),
          roomIndex: Number(row.room_index),
          roomName: row.room_name,
          roomStatus: row.room_status,
          difficultyLevel: row.difficulty_level === null ? null : Number(row.difficulty_level),
        } : null,
        state: row.room_player_status ?? "Active",
        capturedAt: toIsoString(row.entered_at ?? row.joined_at),
        capturedAtSeconds: getElapsedSeconds(session.started_at, row.entered_at ?? row.joined_at),
        order: index + 1,
      })),
    });
  } catch (error) {
    console.error("Latest positions error:", error);
    return res.status(500).json({
      message: "Failed to load latest position snapshots",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

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

monitoringReportingRouter.post("/admin/logs/audit", async (req, res) => {
  try {
    const { managerId, sessionId = null, actionType, details } = req.body;

    if (!managerId || !actionType || !details) {
      return res.status(400).json({
        message: "managerId, actionType, and details are required",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO audit_log (
        manager_id,
        session_id,
        action_type,
        details_json
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        managerId,
        sessionId,
        actionType,
        JSON.stringify(details),
      ]
    );

    res.status(201).json({
      message: "Audit log created successfully",
      auditId: result.insertId,
    });

    publishAdminEvent({
      type: "audit_log_created",
      sessionId,
      scope: sessionId ? "session" : "all",
      reason: actionType,
    });
  } catch (error) {
    console.error("Audit log insert error:", error);
    res.status(500).json({
      message: "Failed to create audit log",
      error: error.message,
    });
  }
});

monitoringReportingRouter.get("/admin/logs/audit", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.audit_id,
        a.manager_id,
        a.session_id,
        a.action_type,
        a.action_time,
        a.details_json,
        m.username AS manager_username
      FROM audit_log a
      LEFT JOIN manager m
        ON a.manager_id = m.manager_id
      ORDER BY a.action_time DESC
      LIMIT 100
    `);

    res.json(
      rows.map((row) => ({
        auditId: row.audit_id,
        managerId: row.manager_id,
        managerUsername: row.manager_username || null,
        sessionId: row.session_id,
        actionType: row.action_type,
        actionTime: row.action_time,
        details: row.details_json,
      }))
    );
  } catch (error) {
    console.error("Audit log fetch error:", error);
    res.status(500).json({
      message: "Failed to load audit logs",
      error: error.message,
    });
  }
});

monitoringReportingRouter.get("/admin/reports/session-events", async (req, res) => {
  try {
    const { sessionId } = req.query;

    let query = `
      SELECT
        ee.event_id,
        ee.session_id,
        ee.session_room_id,
        ee.event_type,
        ee.payload_json,
        ee.triggered_by,
        ee.triggered_by_manager_id,
        ee.created_at
      FROM environment_event ee
    `;

    const params = [];

    if (sessionId) {
      query += " WHERE ee.session_id = ? ";
      params.push(sessionId);
    }

    query += " ORDER BY ee.created_at DESC";

    const [rows] = await pool.query(query, params);

    res.json(
      rows.map((row) => ({
        eventId: row.event_id,
        sessionId: row.session_id,
        roomId: row.session_room_id,
        eventType: row.event_type,
        payload: row.payload_json,
        triggeredBy: row.triggered_by,
        managerId: row.triggered_by_manager_id,
        timestamp: row.created_at,
      }))
    );
  } catch (error) {
    console.error("Session events error:", error);
    res.status(500).json({
      message: "Failed to load session events",
      error: error.message,
    });
  }
});
