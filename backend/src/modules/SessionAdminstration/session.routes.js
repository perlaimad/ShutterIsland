import { Router } from "express";
import { pool } from "../../config/db.js";
import { publishAdminEvent } from "../../common/realtime/sse.js";

export const sessionAdministrationRouter = Router();

const SESSION_STATUS = {
  LOBBY: "Lobby",
  ACTIVE: "Active",
  PAUSED: "Paused",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

const ROOM_STATUS = {
  ACTIVE: "Active",
  FAILED: "Failed",
  LOCKED: "Locked",
  PENDING: "Pending",
};

const TIMER_STATUS = {
  PAUSED: "paused",
  RUNNING: "running",
  STOPPED: "stopped",
};

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const asMonthString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed) ? trimmed : null;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatSessionStatusLabel = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  const labels = {
    lobby: "Open for setup",
    active: "Live",
    paused: "Paused",
    finished: "Finished",
    cancelled: "Cancelled",
  };

  return labels[normalized] ?? "Unknown";
};

const mapFrontendSessionStatus = (status, startedAt) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active") return "live";
  if (normalized === "finished") return "finished";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "paused") return "closed";
  if (normalized === "lobby") return startedAt ? "open" : "upcoming";

  return "upcoming";
};

const formatDuration = (start, end) => {
  if (!start || !end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const totalMinutes = Math.max(0, Math.round((endDate - startDate) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const findSessionByIdentifier = async (connection, identifier) => {
  const numericId = asPositiveInteger(identifier);
  const [rows] = await connection.execute(
    `SELECT
       session_id,
       session_code,
       status,
       started_at,
       ended_at,
       timer_status
     FROM game_session
     WHERE session_id = ? OR LOWER(session_code) = LOWER(?)
     LIMIT 1`,
    [numericId ?? 0, String(identifier || "").trim()]
  );

  return rows[0] ?? null;
};

const getSessionListRows = async (connection, month) => {
  const params = [];
  let monthFilter = "";

  if (month) {
    monthFilter = `
      WHERE DATE_FORMAT(COALESCE(gs.started_at, gs.created_at), '%Y-%m') = ?
    `;
    params.push(month);
  }

  const [rows] = await connection.execute(
    `SELECT
       gs.session_id,
       gs.session_code,
       gs.status,
       gs.min_players,
       gs.max_players,
       gs.created_at,
       gs.started_at,
       gs.ended_at,
       COUNT(DISTINCT sp.player_id) AS player_count,
       SUM(CASE WHEN sp.is_alive = 1 THEN 1 ELSE 0 END) AS alive_count,
       MAX(CASE WHEN sp.final_rank = 1 THEN p.display_name ELSE NULL END) AS winner_name
     FROM game_session gs
     LEFT JOIN session_player sp
       ON sp.session_id = gs.session_id
     LEFT JOIN player p
       ON p.player_id = sp.player_id
     ${monthFilter}
     GROUP BY
       gs.session_id,
       gs.session_code,
       gs.status,
       gs.min_players,
       gs.max_players,
       gs.created_at,
       gs.started_at,
       gs.ended_at
     ORDER BY COALESCE(gs.started_at, gs.created_at) ASC, gs.session_id ASC`,
    params
  );

  return rows;
};

const buildSessionListItem = (row) => {
  const startsAt = row.started_at ?? row.created_at;
  const startsDate = startsAt ? new Date(startsAt) : null;

  return {
    id: String(row.session_id),
    sessionId: Number(row.session_id),
    code: row.session_code,
    romanId: row.session_code,
    date: startsDate && !Number.isNaN(startsDate.getTime())
      ? startsDate.toISOString().slice(0, 10)
      : null,
    time: startsDate && !Number.isNaN(startsDate.getTime())
      ? startsDate.toISOString().slice(11, 16)
      : null,
    startsAt: toIsoString(startsAt),
    createdAt: toIsoString(row.created_at),
    endedAt: toIsoString(row.ended_at),
    status: mapFrontendSessionStatus(row.status, row.started_at),
    rawStatus: row.status,
    statusLabel: formatSessionStatusLabel(row.status),
    players: Number(row.player_count || 0),
    capacity: Number(row.max_players || 0),
    minPlayers: Number(row.min_players || 0),
    alivePlayers: Number(row.alive_count || 0),
    winner: row.winner_name || null,
    duration: formatDuration(row.started_at, row.ended_at),
  };
};

const getSessionRoster = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       sp.player_id,
       p.display_name,
       p.status AS player_status,
       sp.slot_number,
       sp.joined_at,
       sp.is_alive,
       sp.eliminated_at,
       sp.final_rank
     FROM session_player sp
     JOIN player p
       ON p.player_id = sp.player_id
     WHERE sp.session_id = ?
     ORDER BY sp.slot_number ASC, sp.player_id ASC`,
    [sessionId]
  );

  return rows.map((row) => ({
    playerId: Number(row.player_id),
    displayName: row.display_name,
    playerStatus: row.player_status,
    slotNumber: Number(row.slot_number),
    joinedAt: toIsoString(row.joined_at),
    isAlive: Boolean(row.is_alive),
    eliminatedAt: toIsoString(row.eliminated_at),
    finalRank: row.final_rank === null ? null : Number(row.final_rank),
  }));
};

const getSessionRooms = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.room_index,
       sr.status,
       sr.started_at,
       sr.ended_at,
       sr.min_eliminations_to_unlock,
       sr.unlocked_next_room_at,
       r.room_id,
       r.name AS room_name,
       r.difficulty_level,
       r.time_limit_seconds
     FROM session_room sr
     JOIN room r
       ON r.room_id = sr.room_id
     WHERE sr.session_id = ?
     ORDER BY sr.room_index ASC`,
    [sessionId]
  );

  return rows.map((row) => ({
    sessionRoomId: Number(row.session_room_id),
    roomId: Number(row.room_id),
    roomIndex: Number(row.room_index),
    roomName: row.room_name,
    roomStatus: row.status,
    difficultyLevel: Number(row.difficulty_level),
    timeLimitSeconds: row.time_limit_seconds === null ? null : Number(row.time_limit_seconds),
    startedAt: toIsoString(row.started_at),
    endedAt: toIsoString(row.ended_at),
    unlockedNextRoomAt: toIsoString(row.unlocked_next_room_at),
    minEliminationsToUnlock: Number(row.min_eliminations_to_unlock),
  }));
};

const getSessionEliminationSummary = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       e.elimination_id,
       e.reason,
       e.ts,
       p.player_id,
       p.display_name,
       sr.room_index,
       r.name AS room_name
     FROM elimination e
     JOIN player p
       ON p.player_id = e.player_id
     JOIN session_room sr
       ON sr.session_room_id = e.session_room_id
     JOIN room r
       ON r.room_id = sr.room_id
     WHERE e.session_id = ?
     ORDER BY e.ts ASC, e.elimination_id ASC`,
    [sessionId]
  );

  return rows.map((row) => ({
    eliminationId: Number(row.elimination_id),
    playerId: Number(row.player_id),
    displayName: row.display_name,
    reason: row.reason,
    roomIndex: Number(row.room_index),
    roomName: row.room_name,
    eliminatedAt: toIsoString(row.ts),
  }));
};

const getFirstAvailableRoom = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       session_room_id,
       room_index,
       status
     FROM session_room
     WHERE session_id = ?
       AND status IN (?, ?)
     ORDER BY room_index ASC
     LIMIT 1`,
    [sessionId, ROOM_STATUS.PENDING, ROOM_STATUS.LOCKED]
  );

  return rows[0] ?? null;
};

const getSessionResponse = (session, message) => ({
  message,
  session: {
    sessionId: Number(session.session_id),
    sessionCode: session.session_code,
    status: session.status,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    timerStatus: session.timer_status,
  },
});

const sendSessionAction = (handler) => async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const payload = await handler(connection, req.params.sessionIdentifier, req.body ?? {});

    if (!payload) {
      return res.status(404).json({ message: "Session not found." });
    }

    publishAdminEvent({
      type: "session_control_updated",
      sessionId: payload.session.sessionId,
      scope: "session",
      reason: req.path,
    });

    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Session action failed.",
    });
  } finally {
    connection.release();
  }
};

sessionAdministrationRouter.get("/sessions", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const month = req.query.month ? asMonthString(req.query.month) : null;

    if (req.query.month && !month) {
      return res.status(400).json({
        message: "month must be in YYYY-MM format.",
      });
    }

    const rows = await getSessionListRows(connection, month);

    return res.json({
      month,
      count: rows.length,
      sessions: rows.map(buildSessionListItem),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load sessions.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

sessionAdministrationRouter.get("/sessions/:sessionIdentifier", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const session = await findSessionByIdentifier(connection, req.params.sessionIdentifier);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    const [sessionRows] = await connection.execute(
      `SELECT
         gs.session_id,
         gs.session_code,
         gs.status,
         gs.min_players,
         gs.max_players,
         gs.created_at,
         gs.started_at,
         gs.ended_at,
         gs.timer_status,
         m.manager_id AS created_by_manager_id,
         m.username AS created_by_username,
         COUNT(DISTINCT sp.player_id) AS player_count,
         SUM(CASE WHEN sp.is_alive = 1 THEN 1 ELSE 0 END) AS alive_count,
         MAX(CASE WHEN sp.final_rank = 1 THEN p.display_name ELSE NULL END) AS winner_name
       FROM game_session gs
       JOIN manager m
         ON m.manager_id = gs.created_by_manager_id
       LEFT JOIN session_player sp
         ON sp.session_id = gs.session_id
       LEFT JOIN player p
         ON p.player_id = sp.player_id
       WHERE gs.session_id = ?
       GROUP BY
         gs.session_id,
         gs.session_code,
         gs.status,
         gs.min_players,
         gs.max_players,
         gs.created_at,
         gs.started_at,
         gs.ended_at,
         gs.timer_status,
         m.manager_id,
         m.username
       LIMIT 1`,
      [session.session_id]
    );

    const detail = sessionRows[0];
    const roster = await getSessionRoster(connection, session.session_id);
    const rooms = await getSessionRooms(connection, session.session_id);
    const eliminations = await getSessionEliminationSummary(connection, session.session_id);

    return res.json({
      session: {
        sessionId: Number(detail.session_id),
        sessionCode: detail.session_code,
        romanId: detail.session_code,
        rawStatus: detail.status,
        statusLabel: formatSessionStatusLabel(detail.status),
        status: mapFrontendSessionStatus(detail.status, detail.started_at),
        minPlayers: Number(detail.min_players),
        maxPlayers: Number(detail.max_players),
        playerCount: Number(detail.player_count || 0),
        alivePlayers: Number(detail.alive_count || 0),
        winner: detail.winner_name || null,
        timerStatus: detail.timer_status,
        createdAt: toIsoString(detail.created_at),
        startedAt: toIsoString(detail.started_at),
        endedAt: toIsoString(detail.ended_at),
        duration: formatDuration(detail.started_at, detail.ended_at),
        createdBy: {
          managerId: Number(detail.created_by_manager_id),
          username: detail.created_by_username,
        },
      },
      participants: roster,
      rooms,
      eliminations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load session details.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

sessionAdministrationRouter.post("/sessions/:sessionIdentifier/start", sendSessionAction(async (connection, identifier) => {
  await connection.beginTransaction();

  try {
    const session = await findSessionByIdentifier(connection, identifier);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if ([SESSION_STATUS.FINISHED, SESSION_STATUS.CANCELLED].includes(session.status)) {
      const error = new Error("Finished or cancelled sessions cannot be started.");
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      `UPDATE game_session
       SET status = ?,
           started_at = COALESCE(started_at, NOW()),
           ended_at = NULL
       WHERE session_id = ?`,
      [SESSION_STATUS.ACTIVE, session.session_id]
    );

    const firstRoom = await getFirstAvailableRoom(connection, session.session_id);

    if (firstRoom) {
      await connection.execute(
        `UPDATE session_room
         SET status = ?,
             started_at = COALESCE(started_at, NOW())
         WHERE session_room_id = ?`,
        [ROOM_STATUS.ACTIVE, firstRoom.session_room_id]
      );
    }

    const [updatedRows] = await connection.execute(
      `SELECT
         session_id,
         session_code,
         status,
         started_at,
         ended_at,
         timer_status
       FROM game_session
       WHERE session_id = ?
       LIMIT 1`,
      [session.session_id]
    );

    await connection.commit();
    return getSessionResponse(updatedRows[0], "Session started successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}));

sessionAdministrationRouter.post("/sessions/:sessionIdentifier/resume", sendSessionAction(async (connection, identifier) => {
  await connection.beginTransaction();

  try {
    const session = await findSessionByIdentifier(connection, identifier);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (session.status !== SESSION_STATUS.PAUSED) {
      const error = new Error("Only paused sessions can be resumed.");
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      `UPDATE game_session
       SET status = ?,
           timer_status = CASE WHEN timer_status = ? THEN ? ELSE timer_status END
       WHERE session_id = ?`,
      [SESSION_STATUS.ACTIVE, TIMER_STATUS.PAUSED, TIMER_STATUS.RUNNING, session.session_id]
    );

    const [updatedRows] = await connection.execute(
      `SELECT
         session_id,
         session_code,
         status,
         started_at,
         ended_at,
         timer_status
       FROM game_session
       WHERE session_id = ?
       LIMIT 1`,
      [session.session_id]
    );

    await connection.commit();
    return getSessionResponse(updatedRows[0], "Session resumed successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}));

sessionAdministrationRouter.post("/sessions/:sessionIdentifier/pause", sendSessionAction(async (connection, identifier) => {
  await connection.beginTransaction();

  try {
    const session = await findSessionByIdentifier(connection, identifier);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (session.status !== SESSION_STATUS.ACTIVE) {
      const error = new Error("Only active sessions can be paused.");
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      `UPDATE game_session
       SET status = ?,
           timer_status = CASE WHEN timer_status = ? THEN ? ELSE timer_status END
       WHERE session_id = ?`,
      [SESSION_STATUS.PAUSED, TIMER_STATUS.RUNNING, TIMER_STATUS.PAUSED, session.session_id]
    );

    const [updatedRows] = await connection.execute(
      `SELECT
         session_id,
         session_code,
         status,
         started_at,
         ended_at,
         timer_status
       FROM game_session
       WHERE session_id = ?
       LIMIT 1`,
      [session.session_id]
    );

    await connection.commit();
    return getSessionResponse(updatedRows[0], "Session paused successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}));

sessionAdministrationRouter.post("/sessions/:sessionIdentifier/terminate", sendSessionAction(async (connection, identifier) => {
  await connection.beginTransaction();

  try {
    const session = await findSessionByIdentifier(connection, identifier);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if ([SESSION_STATUS.FINISHED, SESSION_STATUS.CANCELLED].includes(session.status)) {
      const error = new Error("This session has already ended.");
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      `UPDATE game_session
       SET status = ?,
           ended_at = COALESCE(ended_at, NOW()),
           timer_status = CASE
             WHEN timer_status IN (?, ?) THEN ?
             ELSE timer_status
           END
       WHERE session_id = ?`,
      [
        SESSION_STATUS.FINISHED,
        TIMER_STATUS.RUNNING,
        TIMER_STATUS.PAUSED,
        TIMER_STATUS.STOPPED,
        session.session_id,
      ]
    );

    await connection.execute(
      `UPDATE session_room
       SET status = ?
       WHERE session_id = ?
         AND status = ?`,
      [ROOM_STATUS.FAILED, session.session_id, ROOM_STATUS.ACTIVE]
    );

    const [updatedRows] = await connection.execute(
      `SELECT
         session_id,
         session_code,
         status,
         started_at,
         ended_at,
         timer_status
       FROM game_session
       WHERE session_id = ?
       LIMIT 1`,
      [session.session_id]
    );

    await connection.commit();
    return getSessionResponse(updatedRows[0], "Session terminated successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}));
import { AUTH_PERMISSIONS } from "../AuthenticationAccessControl/access-control.js";
import {
  authenticateStaff,
  authorizeAnyPermission
} from "../AuthenticationAccessControl/auth.middleware.js";
import {
  createSession,
  deleteSession,
  getSessionById,
  listSessions,
  pauseSession,
  resumeSession,
  terminateSession,
  updateSession
} from "./session.service.js";

export const sessionAdministrationRouter = Router();

const requireSessionRead = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_READ, AUTH_PERMISSIONS.SESSION_MANAGE)
];

const requireSessionManage = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_MANAGE)
];

const parseSessionId = (value) => {
  const sessionId = Number(value);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
};

const sendError = (res, error, fallbackMessage) => {
  return res.status(error.statusCode ?? 500).json({
    message: error.message ?? fallbackMessage
  });
};

sessionAdministrationRouter.get("/sessions", async (req, res) => {
  try {
    const sessions = await listSessions({
      month: req.query?.month
    });

    return res.json({ sessions });
  } catch (error) {
    return sendError(res, error, "Failed to load sessions.");
  }
});

sessionAdministrationRouter.post("/session-administration/sessions", requireSessionManage, async (req, res) => {
  try {
    const session = await createSession({
      ...(req.body ?? {}),
      createdByManagerId: req.staff.id
    });
    return res.status(201).json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to create session.");
  }
});

sessionAdministrationRouter.patch("/session-administration/sessions/:sessionId", requireSessionManage, async (req, res) => {
  const sessionId = parseSessionId(req.params.sessionId);

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId must be a positive integer." });
  }

  try {
    const session = await updateSession(sessionId, req.body ?? {});

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    return res.json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to update session.");
  }
});

sessionAdministrationRouter.delete("/session-administration/sessions/:sessionId", requireSessionManage, async (req, res) => {
  const sessionId = parseSessionId(req.params.sessionId);

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId must be a positive integer." });
  }

  try {
    const session = await deleteSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    return res.json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to remove session.");
  }
});

sessionAdministrationRouter.post(
  "/session-administration/sessions/:sessionId/pause",
  requireSessionManage,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    try {
      const session = await pauseSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.json({ session });
    } catch (error) {
      return sendError(res, error, "Failed to pause session.");
    }
  }
);

sessionAdministrationRouter.post(
  "/session-administration/sessions/:sessionId/resume",
  requireSessionManage,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    try {
      const session = await resumeSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.json({ session });
    } catch (error) {
      return sendError(res, error, "Failed to resume session.");
    }
  }
);

sessionAdministrationRouter.post(
  "/session-administration/sessions/:sessionId/terminate",
  requireSessionManage,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    try {
      const session = await terminateSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.json({ session });
    } catch (error) {
      return sendError(res, error, "Failed to terminate session.");
    }
  }
);

sessionAdministrationRouter.get("/session-administration/sessions/:sessionId", requireSessionRead, async (req, res) => {
  const sessionId = parseSessionId(req.params.sessionId);

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId must be a positive integer." });
  }

  try {
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    return res.json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to load session.");
  }
});
