import { pool } from "../../config/db.js";

const SESSION_STATUS = {
  LOBBY: "Lobby",
  ACTIVE: "Active",
  PAUSED: "Paused",
  FINISHED: "Finished",
  CANCELLED: "Cancelled"
};

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const asOptionalPositiveInteger = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return asPositiveInteger(value);
};

const asOptionalSessionCode = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 24) {
    return null;
  }

  return trimmed;
};

const asNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const mapSession = (row) => ({
  sessionId: Number(row.session_id),
  sessionCode: row.session_code,
  createdByManagerId: Number(row.created_by_manager_id),
  minPlayers: Number(row.min_players),
  maxPlayers: Number(row.max_players),
  status: row.status,
  createdAt: row.created_at?.toISOString?.() ?? null,
  startedAt: row.started_at?.toISOString?.() ?? null,
  endedAt: row.ended_at?.toISOString?.() ?? null,
  timerStatus: row.timer_status,
  timerDurationSeconds:
    row.timer_duration_seconds === null ? null : Number(row.timer_duration_seconds)
});

const getSessionRow = async (sessionId) => {
  const [rows] = await pool.execute(
    `SELECT
       session_id,
       session_code,
       created_by_manager_id,
       min_players,
       max_players,
       status,
       created_at,
       started_at,
       ended_at,
       timer_status,
       timer_duration_seconds
     FROM game_session
     WHERE session_id = ?
     LIMIT 1`,
    [sessionId]
  );

  return rows[0] ?? null;
};

const ensureSessionCodeIsUnique = async (sessionCode, excludeSessionId = null) => {
  const params = [sessionCode];
  let query = "SELECT session_id FROM game_session WHERE session_code = ? LIMIT 1";

  if (excludeSessionId) {
    query = `${query} AND session_id <> ?`;
    params.push(excludeSessionId);
  }

  const [rows] = await pool.execute(
    excludeSessionId
      ? "SELECT session_id FROM game_session WHERE session_code = ? AND session_id <> ? LIMIT 1"
      : "SELECT session_id FROM game_session WHERE session_code = ? LIMIT 1",
    params
  );

  if (rows[0]) {
    throw createHttpError("sessionCode is already in use.", 409);
  }
};

const validatePlayerBounds = (minPlayers, maxPlayers) => {
  if (minPlayers > maxPlayers) {
    throw createHttpError("minPlayers must be less than or equal to maxPlayers.", 400);
  }

  if (maxPlayers > 7) {
    throw createHttpError("maxPlayers cannot be greater than 7.", 400);
  }
};

export const getSessionById = async (sessionId) => {
  const row = await getSessionRow(sessionId);
  return row ? mapSession(row) : null;
};

export const listSessions = async (filters = {}) => {
  const month = asNonEmptyString(filters.month);
  const status = asNonEmptyString(filters.status);
  const conditions = [];
  const values = [];

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw createHttpError("month must match YYYY-MM.", 400);
    }

    conditions.push("DATE_FORMAT(COALESCE(started_at, created_at), '%Y-%m') = ?");
    values.push(month);
  }

  if (status) {
    conditions.push("LOWER(status) = LOWER(?)");
    values.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `SELECT
       session_id,
       session_code,
       created_by_manager_id,
       min_players,
       max_players,
       status,
       created_at,
       started_at,
       ended_at,
       timer_status,
       timer_duration_seconds
     FROM game_session
     ${whereClause}
     ORDER BY COALESCE(started_at, created_at) ASC, session_id ASC`,
    values
  );

  return rows.map(mapSession);
};

export const createSession = async (input = {}) => {
  const createdByManagerId = asPositiveInteger(input.createdByManagerId);
  const minPlayers = asPositiveInteger(input.minPlayers);
  const maxPlayers = asPositiveInteger(input.maxPlayers);
  const sessionCode = asOptionalSessionCode(input.sessionCode);

  if (!createdByManagerId) {
    throw createHttpError("createdByManagerId must be a positive integer.", 400);
  }

  if (!minPlayers) {
    throw createHttpError("minPlayers must be a positive integer.", 400);
  }

  if (!maxPlayers) {
    throw createHttpError("maxPlayers must be a positive integer.", 400);
  }

  if (!sessionCode) {
    throw createHttpError("sessionCode is required and must be 1-24 characters.", 400);
  }

  validatePlayerBounds(minPlayers, maxPlayers);
  await ensureSessionCodeIsUnique(sessionCode);

  try {
    const [result] = await pool.execute(
      `INSERT INTO game_session (
         session_code,
         created_by_manager_id,
         min_players,
         max_players
       )
       VALUES (?, ?, ?, ?)`,
      [sessionCode, createdByManagerId, minPlayers, maxPlayers]
    );

    const created = await getSessionRow(Number(result.insertId));
    return mapSession(created);
  } catch (error) {
    if (error?.code === "ER_NO_REFERENCED_ROW_2") {
      throw createHttpError("createdByManagerId does not reference an existing manager.", 404);
    }

    throw error;
  }
};

export const updateSession = async (sessionId, input = {}) => {
  const current = await getSessionRow(sessionId);

  if (!current) {
    return null;
  }

  const nextValues = {
    sessionCode: asOptionalSessionCode(input.sessionCode),
    minPlayers: asOptionalPositiveInteger(input.minPlayers),
    maxPlayers: asOptionalPositiveInteger(input.maxPlayers)
  };

  if (nextValues.sessionCode === null) {
    throw createHttpError("sessionCode must be 1-24 characters when provided.", 400);
  }

  if (input.minPlayers !== undefined && !nextValues.minPlayers) {
    throw createHttpError("minPlayers must be a positive integer when provided.", 400);
  }

  if (input.maxPlayers !== undefined && !nextValues.maxPlayers) {
    throw createHttpError("maxPlayers must be a positive integer when provided.", 400);
  }

  const sessionCode = nextValues.sessionCode ?? current.session_code;
  const minPlayers = nextValues.minPlayers ?? Number(current.min_players);
  const maxPlayers = nextValues.maxPlayers ?? Number(current.max_players);

  validatePlayerBounds(minPlayers, maxPlayers);

  if (nextValues.sessionCode) {
    await ensureSessionCodeIsUnique(sessionCode, sessionId);
  }

  await pool.execute(
    `UPDATE game_session
     SET session_code = ?,
         min_players = ?,
         max_players = ?
     WHERE session_id = ?`,
    [sessionCode, minPlayers, maxPlayers, sessionId]
  );

  const updated = await getSessionRow(sessionId);
  return mapSession(updated);
};

export const deleteSession = async (sessionId) => {
  const current = await getSessionRow(sessionId);

  if (!current) {
    return null;
  }

  if (![SESSION_STATUS.LOBBY, SESSION_STATUS.CANCELLED, SESSION_STATUS.FINISHED].includes(current.status)) {
    throw createHttpError(
      "Only lobby, cancelled, or finished sessions can be removed.",
      409
    );
  }

  await pool.execute("DELETE FROM game_session WHERE session_id = ?", [sessionId]);
  return mapSession(current);
};

const applyStatusTransition = async (sessionId, targetStatus, allowedFromStatuses) => {
  const session = await getSessionRow(sessionId);

  if (!session) {
    return null;
  }

  if (!allowedFromStatuses.includes(session.status)) {
    throw createHttpError(
      `Session status must be one of: ${allowedFromStatuses.join(", ")}.`,
      409
    );
  }

  const shouldSetStartedAt = targetStatus === SESSION_STATUS.ACTIVE;
  const shouldSetEndedAt =
    targetStatus === SESSION_STATUS.FINISHED || targetStatus === SESSION_STATUS.CANCELLED;

  await pool.execute(
    `UPDATE game_session
     SET status = ?,
         started_at = CASE
           WHEN ? = 1 THEN COALESCE(started_at, NOW())
           ELSE started_at
         END,
         ended_at = CASE
           WHEN ? = 1 THEN COALESCE(ended_at, NOW())
           ELSE ended_at
         END
     WHERE session_id = ?`,
    [targetStatus, shouldSetStartedAt ? 1 : 0, shouldSetEndedAt ? 1 : 0, sessionId]
  );

  const updated = await getSessionRow(sessionId);
  return mapSession(updated);
};

export const pauseSession = async (sessionId) => {
  return applyStatusTransition(sessionId, SESSION_STATUS.PAUSED, [SESSION_STATUS.ACTIVE]);
};

export const resumeSession = async (sessionId) => {
  return applyStatusTransition(sessionId, SESSION_STATUS.ACTIVE, [
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.LOBBY
  ]);
};

export const terminateSession = async (sessionId) => {
  return applyStatusTransition(sessionId, SESSION_STATUS.CANCELLED, [
    SESSION_STATUS.LOBBY,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PAUSED
  ]);
};

const getSessionParticipantRows = async (sessionId) => {
  const [rows] = await pool.execute(
    `SELECT
       sp.session_id,
       sp.player_id,
       sp.slot_number,
       sp.joined_at,
       sp.is_alive,
       sp.eliminated_at,
       sp.final_rank,
       p.display_name,
       p.status AS player_status
     FROM session_player sp
     JOIN player p ON p.player_id = sp.player_id
     WHERE sp.session_id = ?
     ORDER BY sp.slot_number ASC, sp.player_id ASC`,
    [sessionId]
  );

  return rows;
};

const mapSessionParticipant = (row) => ({
  sessionId: Number(row.session_id),
  playerId: Number(row.player_id),
  displayName: row.display_name,
  slotNumber: Number(row.slot_number),
  joinedAt: row.joined_at?.toISOString?.() ?? null,
  isAlive: Boolean(row.is_alive),
  eliminatedAt: row.eliminated_at?.toISOString?.() ?? null,
  finalRank: row.final_rank === null ? null : Number(row.final_rank),
  playerStatus: row.player_status
});

const getSessionParticipantCount = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS participant_count FROM session_player WHERE session_id = ?",
    [sessionId]
  );

  return Number(rows[0]?.participant_count ?? 0);
};

const insertAuditLog = async (connection, { managerId, sessionId, actionType, details }) => {
  if (!managerId) {
    return null;
  }

  const [result] = await connection.execute(
    `INSERT INTO audit_log (
       manager_id,
       session_id,
       action_type,
       details_json
     )
     VALUES (?, ?, ?, ?)`,
    [managerId, sessionId, actionType, JSON.stringify(details ?? {})]
  );

  return Number(result.insertId);
};

const createOrResolveParticipant = async (connection, input = {}) => {
  const explicitPlayerId = asPositiveInteger(input.playerId);

  if (explicitPlayerId) {
    const [rows] = await connection.execute(
      "SELECT player_id, display_name, status FROM player WHERE player_id = ? LIMIT 1",
      [explicitPlayerId]
    );

    if (!rows[0]) {
      throw createHttpError("playerId does not reference an existing player.", 404);
    }

    return {
      playerId: Number(rows[0].player_id),
      displayName: rows[0].display_name,
      status: rows[0].status
    };
  }

  const displayName = asNonEmptyString(input.displayName);
  if (!displayName) {
    throw createHttpError("Either playerId or displayName is required.", 400);
  }

  if (displayName.length > 120) {
    throw createHttpError("displayName must be 120 characters or fewer.", 400);
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO player (
       display_name,
       status
     )
     VALUES (?, 'Active')`,
    [displayName]
  );

  return {
    playerId: Number(insertResult.insertId),
    displayName,
    status: "Active"
  };
};

export const listSessionParticipants = async (sessionId) => {
  const session = await getSessionById(sessionId);
  if (!session) {
    return null;
  }

  const rows = await getSessionParticipantRows(sessionId);
  return {
    session,
    participants: rows.map(mapSessionParticipant)
  };
};

export const registerParticipant = async (sessionId, input = {}) => {
  const slotNumber = asPositiveInteger(input.slotNumber);
  const managerId = asPositiveInteger(input.managerId);
  const connection = await pool.getConnection();

  if (!slotNumber) {
    throw createHttpError("slotNumber must be a positive integer.", 400);
  }

  if (slotNumber > 7) {
    throw createHttpError("slotNumber cannot exceed 7.", 400);
  }

  try {
    await connection.beginTransaction();
    const session = await getSessionRow(sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (![SESSION_STATUS.LOBBY, SESSION_STATUS.PAUSED].includes(session.status)) {
      throw createHttpError("Participants can only be registered in lobby or paused sessions.", 409);
    }

    const participantCount = await getSessionParticipantCount(connection, sessionId);
    if (participantCount >= Number(session.max_players)) {
      throw createHttpError("Session has reached maxPlayers capacity.", 409);
    }

    const participant = await createOrResolveParticipant(connection, input);
    const [existingRows] = await connection.execute(
      "SELECT session_id FROM session_player WHERE session_id = ? AND player_id = ? LIMIT 1",
      [sessionId, participant.playerId]
    );
    if (existingRows[0]) {
      throw createHttpError("Player is already registered in this session.", 409);
    }

    await connection.execute(
      `INSERT INTO session_player (
         session_id,
         player_id,
         slot_number,
         joined_at,
         is_alive
       )
       VALUES (?, ?, ?, NOW(), 1)`,
      [sessionId, participant.playerId, slotNumber]
    );

    const auditId = await insertAuditLog(connection, {
      managerId,
      sessionId,
      actionType: "REGISTER_PARTICIPANT",
      details: {
        playerId: participant.playerId,
        displayName: participant.displayName,
        slotNumber
      }
    });

    await connection.commit();
    const updatedParticipants = await getSessionParticipantRows(sessionId);
    return {
      session: mapSession(session),
      participant: {
        playerId: participant.playerId,
        displayName: participant.displayName,
        slotNumber
      },
      auditId,
      participants: updatedParticipants.map(mapSessionParticipant)
    };
  } catch (error) {
    await connection.rollback();
    if (error?.code === "ER_DUP_ENTRY") {
      throw createHttpError("slotNumber is already occupied for this session.", 409);
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const checkInParticipant = async (sessionId, playerId, input = {}) => {
  const resolvedPlayerId = asPositiveInteger(playerId);
  const managerId = asPositiveInteger(input.managerId);
  const connection = await pool.getConnection();

  if (!resolvedPlayerId) {
    throw createHttpError("playerId must be a positive integer.", 400);
  }

  try {
    await connection.beginTransaction();
    const session = await getSessionRow(sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    const [participantRows] = await connection.execute(
      `SELECT
         sp.session_id,
         sp.player_id,
         sp.slot_number,
         sp.joined_at,
         p.display_name
       FROM session_player sp
       JOIN player p ON p.player_id = sp.player_id
       WHERE sp.session_id = ? AND sp.player_id = ?
       LIMIT 1`,
      [sessionId, resolvedPlayerId]
    );
    const participant = participantRows[0];
    if (!participant) {
      throw createHttpError("Player is not registered in this session.", 404);
    }

    await connection.execute(
      "UPDATE player SET status = 'Active' WHERE player_id = ?",
      [resolvedPlayerId]
    );
    await connection.execute(
      `UPDATE session_player
       SET joined_at = COALESCE(joined_at, NOW()),
           is_alive = 1
       WHERE session_id = ? AND player_id = ?`,
      [sessionId, resolvedPlayerId]
    );

    const auditId = await insertAuditLog(connection, {
      managerId,
      sessionId,
      actionType: "CHECKIN_PARTICIPANT",
      details: {
        playerId: resolvedPlayerId,
        displayName: participant.display_name
      }
    });

    await connection.commit();
    const updatedParticipants = await getSessionParticipantRows(sessionId);
    return {
      session: mapSession(session),
      checkedInPlayer: {
        playerId: resolvedPlayerId,
        displayName: participant.display_name,
        slotNumber: Number(participant.slot_number)
      },
      auditId,
      participants: updatedParticipants.map(mapSessionParticipant)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
