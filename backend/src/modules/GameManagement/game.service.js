import { pool } from "../../config/db.js";

const TIMER_STATUS = {
  NOT_STARTED: "not_started",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPED: "stopped",
  FINISHED: "finished"
};

const TIMER_COLUMNS = `
  session_id,
  session_code,
  status AS session_status,
  timer_status,
  timer_duration_seconds,
  timer_started_at,
  timer_paused_at,
  timer_elapsed_before_pause_seconds
`;

const SESSION_STATUS = {
  ACTIVE: "Active",
  PAUSED: "Paused"
};

const ROOM_STATUS = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  FAILED: "Failed",
  LOCKED: "Locked",
  PENDING: "Pending"
};

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const secondsBetween = (from, to) => {
  if (!from) {
    return 0;
  }

  const start = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((to.getTime() - start.getTime()) / 1000));
};

const calculateElapsedSeconds = (session, now = new Date()) => {
  const elapsedBeforePause = Number(session.timer_elapsed_before_pause_seconds ?? 0);

  if (session.timer_status !== TIMER_STATUS.RUNNING) {
    return elapsedBeforePause;
  }

  return elapsedBeforePause + secondsBetween(session.timer_started_at, now);
};

const buildTimerResponse = (session, now = new Date()) => {
  const durationSeconds = session.timer_duration_seconds === null
    ? null
    : Number(session.timer_duration_seconds);
  const elapsedSeconds = calculateElapsedSeconds(session, now);
  const remainingSeconds = durationSeconds === null
    ? null
    : Math.max(durationSeconds - elapsedSeconds, 0);
  const isFinished = durationSeconds !== null && elapsedSeconds >= durationSeconds;
  const timerStatus = session.timer_status === TIMER_STATUS.RUNNING && isFinished
    ? TIMER_STATUS.FINISHED
    : session.timer_status;

  return {
    sessionId: Number(session.session_id),
    sessionCode: session.session_code,
    sessionStatus: session.session_status,
    timerStatus,
    durationSeconds,
    elapsedSeconds,
    remainingSeconds,
    startedAt: toIsoString(session.timer_started_at),
    pausedAt: toIsoString(session.timer_paused_at),
    serverTime: now.toISOString()
  };
};

const findSession = async (sessionId) => {
  const [rows] = await pool.execute(
    `SELECT ${TIMER_COLUMNS} FROM game_session WHERE session_id = ? LIMIT 1`,
    [sessionId]
  );

  return rows[0] ?? null;
};

export const getSessionTimer = async (sessionId) => {
  const session = await findSession(sessionId);

  if (!session) {
    return null;
  }

  return buildTimerResponse(session);
};

export const startSessionTimer = async (sessionId, durationSecondsInput) => {
  const durationSeconds = asPositiveInteger(durationSecondsInput);

  if (!durationSeconds) {
    const error = new Error("durationSeconds must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.execute(
    `UPDATE game_session
     SET timer_status = ?,
         timer_duration_seconds = ?,
         timer_started_at = NOW(),
         timer_paused_at = NULL,
         timer_elapsed_before_pause_seconds = 0
     WHERE session_id = ?`,
    [TIMER_STATUS.RUNNING, durationSeconds, sessionId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSessionTimer(sessionId);
};

export const pauseSessionTimer = async (sessionId) => {
  const session = await findSession(sessionId);

  if (!session) {
    return null;
  }

  if (session.timer_status !== TIMER_STATUS.RUNNING) {
    const error = new Error("Only a running timer can be paused.");
    error.statusCode = 409;
    throw error;
  }

  const elapsedSeconds = calculateElapsedSeconds(session);
  await pool.execute(
    `UPDATE game_session
     SET timer_status = ?,
         timer_paused_at = NOW(),
         timer_elapsed_before_pause_seconds = ?
     WHERE session_id = ?`,
    [TIMER_STATUS.PAUSED, elapsedSeconds, sessionId]
  );

  return getSessionTimer(sessionId);
};

export const resumeSessionTimer = async (sessionId) => {
  const session = await findSession(sessionId);

  if (!session) {
    return null;
  }

  if (session.timer_status !== TIMER_STATUS.PAUSED) {
    const error = new Error("Only a paused timer can be resumed.");
    error.statusCode = 409;
    throw error;
  }

  await pool.execute(
    `UPDATE game_session
     SET timer_status = ?,
         timer_started_at = NOW(),
         timer_paused_at = NULL
     WHERE session_id = ?`,
    [TIMER_STATUS.RUNNING, sessionId]
  );

  return getSessionTimer(sessionId);
};

export const stopSessionTimer = async (sessionId) => {
  const session = await findSession(sessionId);

  if (!session) {
    return null;
  }

  if (![TIMER_STATUS.RUNNING, TIMER_STATUS.PAUSED].includes(session.timer_status)) {
    const error = new Error("Only a running or paused timer can be stopped.");
    error.statusCode = 409;
    throw error;
  }

  const elapsedSeconds = calculateElapsedSeconds(session);
  await pool.execute(
    `UPDATE game_session
     SET timer_status = ?,
         timer_paused_at = NULL,
         timer_elapsed_before_pause_seconds = ?
     WHERE session_id = ?`,
    [TIMER_STATUS.STOPPED, elapsedSeconds, sessionId]
  );

  return getSessionTimer(sessionId);
};

const getChallengeEventType = (challengeType) => {
  switch (challengeType) {
    case "Timer":
      return "CountdownActivated";
    case "Reaction":
      return "HazardTriggered";
    case "Endgame":
      return "FinalChallengeTriggered";
    default:
      return "ChallengeTriggered";
  }
};

const getChallengeRows = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status AS room_status,
       sr.started_at AS room_started_at,
       sr.ended_at AS room_ended_at,
       r.name AS room_name,
       r.time_limit_seconds AS room_time_limit_seconds,
       r.elimination_rule,
       c.challenge_id,
       c.title,
       c.challenge_type,
       c.description,
       COALESCE(rc.custom_duration_seconds, c.default_duration_seconds) AS duration_seconds,
       rc.order_in_room,
       rc.is_mandatory,
       ev.event_id AS triggered_event_id,
       ev.event_type AS triggered_event_type,
       ev.created_at AS triggered_at
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     JOIN room_challenge rc ON rc.room_id = sr.room_id
     JOIN challenge c ON c.challenge_id = rc.challenge_id
     LEFT JOIN environment_event ev
       ON ev.session_id = sr.session_id
      AND ev.session_room_id = sr.session_room_id
      AND JSON_UNQUOTE(JSON_EXTRACT(ev.payload_json, '$.challengeId')) = CAST(c.challenge_id AS CHAR)
     WHERE sr.session_id = ?
     ORDER BY sr.room_index ASC, rc.order_in_room ASC`,
    [sessionId]
  );

  return rows;
};

const buildChallengeSequenceResponse = (session, rows) => {
  const roomsById = new Map();

  for (const row of rows) {
    if (!roomsById.has(row.session_room_id)) {
      roomsById.set(row.session_room_id, {
        sessionRoomId: Number(row.session_room_id),
        roomId: Number(row.room_id),
        roomIndex: Number(row.room_index),
        roomName: row.room_name,
        roomStatus: row.room_status,
        roomStartedAt: toIsoString(row.room_started_at),
        roomEndedAt: toIsoString(row.room_ended_at),
        roomTimeLimitSeconds: row.room_time_limit_seconds === null
          ? null
          : Number(row.room_time_limit_seconds),
        eliminationRule: row.elimination_rule,
        challenges: []
      });
    }

    roomsById.get(row.session_room_id).challenges.push({
      challengeId: Number(row.challenge_id),
      title: row.title,
      challengeType: row.challenge_type,
      description: row.description,
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      orderInRoom: Number(row.order_in_room),
      isMandatory: Boolean(row.is_mandatory),
      isTriggered: row.triggered_event_id !== null,
      triggeredEventId: row.triggered_event_id === null ? null : Number(row.triggered_event_id),
      triggeredEventType: row.triggered_event_type,
      triggeredAt: toIsoString(row.triggered_at)
    });
  }

  return {
    sessionId: Number(session.session_id),
    sessionCode: session.session_code,
    sessionStatus: session.status,
    rooms: Array.from(roomsById.values())
  };
};

const findGameSession = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT session_id, session_code, status
     FROM game_session
     WHERE session_id = ?
     LIMIT 1`,
    [sessionId]
  );

  return rows[0] ?? null;
};

const findTriggerableRoom = async (connection, sessionId, sessionRoomId) => {
  if (sessionRoomId) {
    const [rows] = await connection.execute(
      `SELECT session_room_id, session_id, room_id, room_index, status
       FROM session_room
       WHERE session_id = ? AND session_room_id = ?
       LIMIT 1`,
      [sessionId, sessionRoomId]
    );

    return rows[0] ?? null;
  }

  const [rows] = await connection.execute(
    `SELECT session_room_id, session_id, room_id, room_index, status
     FROM session_room
     WHERE session_id = ? AND status = ?
     ORDER BY room_index ASC
     LIMIT 1`,
    [sessionId, ROOM_STATUS.ACTIVE]
  );

  return rows[0] ?? null;
};

const findNextChallenge = async (connection, sessionId, sessionRoom, challengeId) => {
  const params = [sessionId, sessionRoom.session_room_id];
  const challengeFilter = challengeId ? "AND c.challenge_id = ?" : "";

  if (challengeId) {
    params.push(challengeId);
  }

  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.room_id,
       sr.room_index,
       r.name AS room_name,
       r.time_limit_seconds AS room_time_limit_seconds,
       c.challenge_id,
       c.title,
       c.challenge_type,
       c.description,
       COALESCE(rc.custom_duration_seconds, c.default_duration_seconds) AS duration_seconds,
       rc.order_in_room,
       rc.is_mandatory,
       ev.event_id AS triggered_event_id
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     JOIN room_challenge rc ON rc.room_id = sr.room_id
     JOIN challenge c ON c.challenge_id = rc.challenge_id
     LEFT JOIN environment_event ev
       ON ev.session_id = sr.session_id
      AND ev.session_room_id = sr.session_room_id
      AND JSON_UNQUOTE(JSON_EXTRACT(ev.payload_json, '$.challengeId')) = CAST(c.challenge_id AS CHAR)
     WHERE sr.session_id = ?
       AND sr.session_room_id = ?
       ${challengeFilter}
       AND ev.event_id IS NULL
     ORDER BY rc.order_in_room ASC
     LIMIT 1`,
    params
  );

  return rows[0] ?? null;
};

export const getChallengeSequence = async (sessionId) => {
  const connection = await pool.getConnection();

  try {
    const session = await findGameSession(connection, sessionId);

    if (!session) {
      return null;
    }

    const rows = await getChallengeRows(connection, sessionId);
    return buildChallengeSequenceResponse(session, rows);
  } finally {
    connection.release();
  }
};

export const triggerChallengeSequence = async (sessionId, options = {}) => {
  const sessionRoomId = asPositiveInteger(options.sessionRoomId);
  const challengeId = asPositiveInteger(options.challengeId);
  const managerId = asPositiveInteger(options.managerId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const session = await findGameSession(connection, sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (![SESSION_STATUS.ACTIVE, SESSION_STATUS.PAUSED].includes(session.status)) {
      throw createHttpError("Only active or paused sessions can trigger challenges.", 409);
    }

    const sessionRoom = await findTriggerableRoom(connection, sessionId, sessionRoomId);

    if (!sessionRoom) {
      throw createHttpError("No matching active session room was found.", 404);
    }

    if ([ROOM_STATUS.COMPLETED, ROOM_STATUS.FAILED, ROOM_STATUS.LOCKED].includes(sessionRoom.status)) {
      throw createHttpError("Challenges cannot be triggered for completed, failed, or locked rooms.", 409);
    }

    if (sessionRoom.status === ROOM_STATUS.PENDING) {
      await connection.execute(
        `UPDATE session_room
         SET status = ?, started_at = COALESCE(started_at, NOW())
         WHERE session_room_id = ?`,
        [ROOM_STATUS.ACTIVE, sessionRoom.session_room_id]
      );
      sessionRoom.status = ROOM_STATUS.ACTIVE;
    }

    const challenge = await findNextChallenge(connection, sessionId, sessionRoom, challengeId);

    if (!challenge) {
      throw createHttpError(
        challengeId
          ? "That challenge is not available or has already been triggered for this room."
          : "All challenges for this room have already been triggered.",
        409
      );
    }

    const eventType = getChallengeEventType(challenge.challenge_type);
    const durationSeconds = challenge.duration_seconds === null
      ? null
      : Number(challenge.duration_seconds);
    const triggeredBy = managerId ? "Manager" : "System";
    const payload = {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionRoomId: Number(challenge.session_room_id),
      roomId: Number(challenge.room_id),
      roomIndex: Number(challenge.room_index),
      roomName: challenge.room_name,
      challengeId: Number(challenge.challenge_id),
      title: challenge.title,
      challengeType: challenge.challenge_type,
      orderInRoom: Number(challenge.order_in_room),
      durationSeconds,
      isMandatory: Boolean(challenge.is_mandatory)
    };

    if (eventType === "CountdownActivated" && durationSeconds) {
      await connection.execute(
        `UPDATE game_session
         SET timer_status = ?,
             timer_duration_seconds = ?,
             timer_started_at = NOW(),
             timer_paused_at = NULL,
             timer_elapsed_before_pause_seconds = 0
         WHERE session_id = ?`,
        [TIMER_STATUS.RUNNING, durationSeconds, sessionId]
      );
      payload.seconds = durationSeconds;
    }

    const [eventResult] = await connection.execute(
      `INSERT INTO environment_event (
         session_id,
         session_room_id,
         event_type,
         payload_json,
         triggered_by,
         triggered_by_manager_id
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        challenge.session_room_id,
        eventType,
        JSON.stringify(payload),
        triggeredBy,
        managerId
      ]
    );

    await connection.commit();

    return {
      eventId: Number(eventResult.insertId),
      eventType,
      triggeredBy,
      triggeredByManagerId: managerId,
      challenge: payload
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
