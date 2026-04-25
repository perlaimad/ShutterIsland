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
