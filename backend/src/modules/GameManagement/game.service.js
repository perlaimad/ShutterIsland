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

const PARTICIPANT_ACTION = {
  ELIMINATED: "PlayerEliminated",
  SURVIVED_ROOM: "PlayerSurvivedRoom",
  ENTERED_ROOM: "PlayerEnteredRoom",
  STATUS_UPDATED: "PlayerStatusUpdated"
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

const asNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
};

const roundTo = (value, digits = 2) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const asPercentage = (part, total) => {
  if (!total) {
    return 0;
  }

  return roundTo((part / total) * 100);
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

const findSessionRoomById = async (connection, sessionId, sessionRoomId) => {
  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status,
       r.name AS room_name
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     WHERE sr.session_id = ? AND sr.session_room_id = ?
     LIMIT 1`,
    [sessionId, sessionRoomId]
  );

  return rows[0] ?? null;
};

const findActiveSessionRoom = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status,
       r.name AS room_name
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     WHERE sr.session_id = ? AND sr.status = ?
     ORDER BY sr.room_index ASC
     LIMIT 1`,
    [sessionId, ROOM_STATUS.ACTIVE]
  );

  return rows[0] ?? null;
};

const findParticipant = async (connection, sessionId, playerId) => {
  const [rows] = await connection.execute(
    `SELECT
       sp.session_id,
       sp.player_id,
       sp.slot_number,
       sp.is_alive,
       sp.eliminated_at,
       sp.final_rank,
       p.display_name
     FROM session_player sp
     JOIN player p ON p.player_id = sp.player_id
     WHERE sp.session_id = ? AND sp.player_id = ?
     LIMIT 1`,
    [sessionId, playerId]
  );

  return rows[0] ?? null;
};

const findElimination = async (connection, sessionId, playerId) => {
  const [rows] = await connection.execute(
    `SELECT elimination_id
     FROM elimination
     WHERE session_id = ? AND player_id = ?
     LIMIT 1`,
    [sessionId, playerId]
  );

  return rows[0] ?? null;
};

const insertAuditLog = async (connection, {
  managerId,
  sessionId,
  actionType,
  details
}) => {
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
    [managerId, sessionId, actionType, JSON.stringify(details)]
  );

  return Number(result.insertId);
};

const insertEnvironmentEvent = async (connection, {
  sessionId,
  sessionRoomId,
  eventType,
  payload,
  managerId
}) => {
  const triggeredBy = managerId ? "Manager" : "System";
  const [result] = await connection.execute(
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
      sessionRoomId,
      eventType,
      JSON.stringify(payload),
      triggeredBy,
      managerId
    ]
  );

  return {
    eventId: Number(result.insertId),
    triggeredBy
  };
};

const buildEventResponse = (row) => ({
  eventId: Number(row.event_id),
  sessionId: Number(row.session_id),
  sessionRoomId: row.session_room_id === null ? null : Number(row.session_room_id),
  eventType: row.event_type,
  payload: row.payload_json,
  triggeredBy: row.triggered_by,
  triggeredByManagerId: row.triggered_by_manager_id === null
    ? null
    : Number(row.triggered_by_manager_id),
  createdAt: toIsoString(row.created_at)
});

const buildEliminationResponse = (row) => ({
  eliminationId: Number(row.elimination_id),
  sessionId: Number(row.session_id),
  sessionRoomId: Number(row.session_room_id),
  roomIndex: Number(row.room_index),
  roomName: row.room_name,
  player: {
    playerId: Number(row.player_id),
    playerName: row.display_name,
    slotNumber: Number(row.slot_number),
    finalRank: row.final_rank === null ? null : Number(row.final_rank)
  },
  reason: row.reason,
  eliminatedAt: toIsoString(row.ts),
  sessionPlayerEliminatedAt: toIsoString(row.eliminated_at)
});

export const getGameEvents = async (sessionId, options = {}) => {
  const limitInput = asPositiveInteger(options.limit);
  const limit = Math.min(limitInput ?? 50, 100);
  const sessionRoomId = asPositiveInteger(options.sessionRoomId);
  const connection = await pool.getConnection();

  try {
    const session = await findGameSession(connection, sessionId);

    if (!session) {
      return null;
    }

    const params = [sessionId];
    const roomFilter = sessionRoomId ? "AND ev.session_room_id = ?" : "";

    if (sessionRoomId) {
      params.push(sessionRoomId);
    }

    const [rows] = await connection.execute(
      `SELECT
         ev.event_id,
         ev.session_id,
         ev.session_room_id,
         ev.event_type,
         ev.payload_json,
         ev.triggered_by,
         ev.triggered_by_manager_id,
         ev.created_at
       FROM environment_event ev
       WHERE ev.session_id = ?
       ${roomFilter}
       ORDER BY ev.created_at DESC, ev.event_id DESC
       LIMIT ${limit}`,
      params
    );

    return {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      events: rows.map(buildEventResponse)
    };
  } finally {
    connection.release();
  }
};

export const getEliminations = async (sessionId) => {
  const connection = await pool.getConnection();

  try {
    const session = await findGameSession(connection, sessionId);

    if (!session) {
      return null;
    }

    const [rows] = await connection.execute(
      `SELECT
         e.elimination_id,
         e.session_id,
         e.session_room_id,
         e.player_id,
         e.reason,
         e.ts,
         sr.room_index,
         r.name AS room_name,
         sp.slot_number,
         sp.eliminated_at,
         sp.final_rank,
         p.display_name
       FROM elimination e
       JOIN session_room sr ON sr.session_room_id = e.session_room_id
       JOIN room r ON r.room_id = sr.room_id
       JOIN player p ON p.player_id = e.player_id
       LEFT JOIN session_player sp
         ON sp.session_id = e.session_id
        AND sp.player_id = e.player_id
       WHERE e.session_id = ?
       ORDER BY e.ts ASC, e.elimination_id ASC`,
      [sessionId]
    );

    return {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionStatus: session.status,
      eliminationCount: rows.length,
      eliminations: rows.map(buildEliminationResponse)
    };
  } finally {
    connection.release();
  }
};

export const eliminateParticipant = async (sessionId, input = {}) => {
  const playerId = asPositiveInteger(input.playerId);
  const managerId = asPositiveInteger(input.managerId);
  const sessionRoomIdInput = asPositiveInteger(input.sessionRoomId);
  const reason = asNonEmptyString(input.reason) ?? "Participant eliminated";
  const finalRankInput = asPositiveInteger(input.finalRank);
  const connection = await pool.getConnection();

  if (!playerId) {
    throw createHttpError("playerId must be a positive integer.", 400);
  }

  if (reason.length > 80) {
    throw createHttpError("reason must be 80 characters or fewer.", 400);
  }

  try {
    await connection.beginTransaction();

    const session = await findGameSession(connection, sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (![SESSION_STATUS.ACTIVE, SESSION_STATUS.PAUSED].includes(session.status)) {
      throw createHttpError("Only active or paused sessions can eliminate participants.", 409);
    }

    const participant = await findParticipant(connection, sessionId, playerId);

    if (!participant) {
      throw createHttpError("Player is not a participant in this session.", 404);
    }

    if (Number(participant.is_alive) !== 1) {
      throw createHttpError("Player has already been eliminated from this session.", 409);
    }

    const existingElimination = await findElimination(connection, sessionId, playerId);

    if (existingElimination) {
      throw createHttpError("Player has already been eliminated from this session.", 409);
    }

    const sessionRoom = sessionRoomIdInput
      ? await findSessionRoomById(connection, sessionId, sessionRoomIdInput)
      : await findActiveSessionRoom(connection, sessionId);

    if (!sessionRoom) {
      throw createHttpError("Session room not found for this elimination.", 404);
    }

    const aliveBeforeElimination = await getRemainingPlayerCount(connection, sessionId);
    const finalRank = finalRankInput ?? aliveBeforeElimination;

    await connection.execute(
      `UPDATE session_player
       SET is_alive = 0,
           eliminated_at = NOW(),
           final_rank = ?
       WHERE session_id = ? AND player_id = ?`,
      [finalRank, sessionId, playerId]
    );

    await connection.execute(
      `INSERT INTO session_room_player (
         session_room_id,
         player_id,
         status
       )
       VALUES (?, ?, 'EliminatedInThisRoom')
       ON DUPLICATE KEY UPDATE status = 'EliminatedInThisRoom'`,
      [sessionRoom.session_room_id, playerId]
    );

    const [eliminationResult] = await connection.execute(
      `INSERT INTO elimination (
         session_id,
         session_room_id,
         player_id,
         reason
       )
       VALUES (?, ?, ?, ?)`,
      [sessionId, sessionRoom.session_room_id, playerId, reason]
    );

    const remainingPlayers = await getRemainingPlayerCount(connection, sessionId);
    const eventPayload = {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionRoomId: Number(sessionRoom.session_room_id),
      roomIndex: Number(sessionRoom.room_index),
      roomName: sessionRoom.room_name,
      playerId: Number(participant.player_id),
      playerName: participant.display_name,
      reason,
      finalRank,
      remainingPlayers
    };

    const event = await insertEnvironmentEvent(connection, {
      sessionId,
      sessionRoomId: sessionRoom.session_room_id,
      eventType: PARTICIPANT_ACTION.ELIMINATED,
      payload: eventPayload,
      managerId
    });
    const auditId = await insertAuditLog(connection, {
      managerId,
      sessionId,
      actionType: "ELIMINATE_PLAYER",
      details: {
        eventId: event.eventId,
        eliminationId: Number(eliminationResult.insertId),
        playerId,
        sessionRoomId: Number(sessionRoom.session_room_id),
        reason
      }
    });

    await connection.commit();

    return {
      eliminationId: Number(eliminationResult.insertId),
      eventId: event.eventId,
      auditId,
      sessionId,
      sessionCode: session.session_code,
      sessionRoomId: Number(sessionRoom.session_room_id),
      roomIndex: Number(sessionRoom.room_index),
      roomName: sessionRoom.room_name,
      player: {
        playerId: Number(participant.player_id),
        playerName: participant.display_name,
        finalRank
      },
      reason,
      remainingPlayers,
      triggeredBy: event.triggeredBy,
      triggeredByManagerId: managerId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const recordGameEvent = async (sessionId, input = {}) => {
  const eventType = asNonEmptyString(input.eventType);
  const managerId = asPositiveInteger(input.managerId);
  const sessionRoomId = asPositiveInteger(input.sessionRoomId);
  const payload = asPlainObject(input.payload);
  const connection = await pool.getConnection();

  if (!eventType) {
    throw createHttpError("eventType is required.", 400);
  }

  try {
    await connection.beginTransaction();

    const session = await findGameSession(connection, sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (sessionRoomId) {
      const sessionRoom = await findSessionRoomById(connection, sessionId, sessionRoomId);

      if (!sessionRoom) {
        throw createHttpError("Session room not found for this session.", 404);
      }
    }

    const eventPayload = {
      ...payload,
      sessionId: Number(session.session_id),
      sessionCode: session.session_code
    };

    if (sessionRoomId) {
      eventPayload.sessionRoomId = sessionRoomId;
    }

    const event = await insertEnvironmentEvent(connection, {
      sessionId,
      sessionRoomId: sessionRoomId ?? null,
      eventType,
      payload: eventPayload,
      managerId
    });
    const auditId = await insertAuditLog(connection, {
      managerId,
      sessionId,
      actionType: "LOG_EVENT",
      details: {
        eventId: event.eventId,
        eventType,
        sessionRoomId: sessionRoomId ?? null
      }
    });

    await connection.commit();

    return {
      eventId: event.eventId,
      auditId,
      sessionId,
      sessionCode: session.session_code,
      sessionRoomId: sessionRoomId ?? null,
      eventType,
      payload: eventPayload,
      triggeredBy: event.triggeredBy,
      triggeredByManagerId: managerId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const recordParticipantAction = async (sessionId, input = {}) => {
  const actionType = asNonEmptyString(input.actionType);
  const playerId = asPositiveInteger(input.playerId);
  const managerId = asPositiveInteger(input.managerId);
  const sessionRoomIdInput = asPositiveInteger(input.sessionRoomId);
  const reason = asNonEmptyString(input.reason);
  const payload = asPlainObject(input.payload);
  const finalRank = asPositiveInteger(input.finalRank);
  const connection = await pool.getConnection();

  if (!actionType) {
    throw createHttpError("actionType is required.", 400);
  }

  if (!playerId) {
    throw createHttpError("playerId must be a positive integer.", 400);
  }

  try {
    await connection.beginTransaction();

    const session = await findGameSession(connection, sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    const participant = await findParticipant(connection, sessionId, playerId);

    if (!participant) {
      throw createHttpError("Player is not a participant in this session.", 404);
    }

    const sessionRoom = sessionRoomIdInput
      ? await findSessionRoomById(connection, sessionId, sessionRoomIdInput)
      : await findActiveSessionRoom(connection, sessionId);

    if (!sessionRoom) {
      throw createHttpError("Session room not found for this participant action.", 404);
    }

    const normalizedAction = actionType;
    const eventPayload = {
      ...payload,
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionRoomId: Number(sessionRoom.session_room_id),
      roomIndex: Number(sessionRoom.room_index),
      roomName: sessionRoom.room_name,
      playerId: Number(participant.player_id),
      playerName: participant.display_name,
      actionType: normalizedAction
    };

    if (reason) {
      eventPayload.reason = reason;
    }

    if (normalizedAction === PARTICIPANT_ACTION.ELIMINATED) {
      await connection.execute(
        `UPDATE session_player
         SET is_alive = 0,
             eliminated_at = COALESCE(eliminated_at, NOW()),
             final_rank = COALESCE(final_rank, ?)
         WHERE session_id = ? AND player_id = ?`,
        [finalRank, sessionId, playerId]
      );

      await connection.execute(
        `UPDATE session_room_player
         SET status = 'EliminatedInThisRoom'
         WHERE session_room_id = ? AND player_id = ?`,
        [sessionRoom.session_room_id, playerId]
      );

      await connection.execute(
        `INSERT IGNORE INTO elimination (
           session_id,
           session_room_id,
           player_id,
           reason
         )
         VALUES (?, ?, ?, ?)`,
        [
          sessionId,
          sessionRoom.session_room_id,
          playerId,
          reason ?? "Participant eliminated"
        ]
      );
    }

    if (normalizedAction === PARTICIPANT_ACTION.SURVIVED_ROOM) {
      await connection.execute(
        `UPDATE session_room_player
         SET status = 'SurvivedRoom'
         WHERE session_room_id = ? AND player_id = ?`,
        [sessionRoom.session_room_id, playerId]
      );
    }

    if (normalizedAction === PARTICIPANT_ACTION.ENTERED_ROOM) {
      await connection.execute(
        `INSERT IGNORE INTO session_room_player (
           session_room_id,
           player_id,
           status
         )
         VALUES (?, ?, 'Active')`,
        [sessionRoom.session_room_id, playerId]
      );
    }

    const event = await insertEnvironmentEvent(connection, {
      sessionId,
      sessionRoomId: sessionRoom.session_room_id,
      eventType: normalizedAction,
      payload: eventPayload,
      managerId
    });
    const auditId = await insertAuditLog(connection, {
      managerId,
      sessionId,
      actionType: normalizedAction === PARTICIPANT_ACTION.ELIMINATED
        ? "ELIMINATE_PLAYER"
        : "UPDATE_PLAYER_STATUS",
      details: {
        eventId: event.eventId,
        actionType: normalizedAction,
        playerId,
        sessionRoomId: Number(sessionRoom.session_room_id)
      }
    });

    await connection.commit();

    return {
      eventId: event.eventId,
      auditId,
      sessionId,
      sessionCode: session.session_code,
      sessionRoomId: Number(sessionRoom.session_room_id),
      actionType: normalizedAction,
      player: {
        playerId: Number(participant.player_id),
        playerName: participant.display_name
      },
      payload: eventPayload,
      triggeredBy: event.triggeredBy,
      triggeredByManagerId: managerId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPerformanceFlow = async (sessionId) => {
  const connection = await pool.getConnection();

  try {
    const [sessionRows] = await connection.execute(
      `SELECT
         session_id,
         session_code,
         status,
         created_at,
         started_at,
         ended_at,
         CASE
           WHEN started_at IS NULL THEN 0
           ELSE TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))
         END AS elapsed_seconds
       FROM game_session
       WHERE session_id = ?
       LIMIT 1`,
      [sessionId]
    );
    const session = sessionRows[0] ?? null;

    if (!session) {
      return null;
    }

    const [roomRows] = await connection.execute(
      `SELECT
         sr.session_room_id,
         sr.room_index,
         sr.status,
         sr.started_at,
         sr.ended_at,
         sr.min_eliminations_to_unlock,
         r.name AS room_name,
         r.difficulty_level,
         r.time_limit_seconds,
         CASE
           WHEN sr.started_at IS NULL THEN 0
           ELSE TIMESTAMPDIFF(SECOND, sr.started_at, COALESCE(sr.ended_at, NOW()))
         END AS elapsed_seconds,
         COUNT(DISTINCT rc.challenge_id) AS challenge_count,
         COUNT(DISTINCT CASE WHEN ev_challenge.event_id IS NOT NULL THEN rc.challenge_id END) AS triggered_challenge_count,
         COUNT(DISTINCT e.elimination_id) AS elimination_count,
         COUNT(DISTINCT ev.event_id) AS event_count
       FROM session_room sr
       JOIN room r ON r.room_id = sr.room_id
       LEFT JOIN room_challenge rc ON rc.room_id = sr.room_id
       LEFT JOIN challenge c ON c.challenge_id = rc.challenge_id
       LEFT JOIN environment_event ev_challenge
         ON ev_challenge.session_id = sr.session_id
        AND ev_challenge.session_room_id = sr.session_room_id
        AND JSON_UNQUOTE(JSON_EXTRACT(ev_challenge.payload_json, '$.challengeId')) = CAST(c.challenge_id AS CHAR)
       LEFT JOIN elimination e ON e.session_room_id = sr.session_room_id
       LEFT JOIN environment_event ev ON ev.session_room_id = sr.session_room_id
       WHERE sr.session_id = ?
       GROUP BY
         sr.session_room_id,
         sr.room_index,
         sr.status,
         sr.started_at,
         sr.ended_at,
         sr.min_eliminations_to_unlock,
         r.name,
         r.difficulty_level,
         r.time_limit_seconds
       ORDER BY sr.room_index ASC`,
      [sessionId]
    );

    const [participantRows] = await connection.execute(
      `SELECT
         COUNT(*) AS total_participants,
         SUM(CASE WHEN is_alive = 1 THEN 1 ELSE 0 END) AS alive_count,
         SUM(CASE WHEN is_alive = 0 THEN 1 ELSE 0 END) AS eliminated_count,
         AVG(
           CASE
             WHEN joined_at IS NULL THEN NULL
             ELSE TIMESTAMPDIFF(SECOND, joined_at, COALESCE(eliminated_at, NOW()))
           END
         ) AS average_survival_seconds
       FROM session_player
       WHERE session_id = ?`,
      [sessionId]
    );

    const [eventRows] = await connection.execute(
      `SELECT event_type, COUNT(*) AS event_count
       FROM environment_event
       WHERE session_id = ?
       GROUP BY event_type
       ORDER BY event_count DESC, event_type ASC`,
      [sessionId]
    );

    const participantStats = participantRows[0] ?? {};
    const totalParticipants = Number(participantStats.total_participants ?? 0);
    const aliveCount = Number(participantStats.alive_count ?? 0);
    const eliminatedCount = Number(participantStats.eliminated_count ?? 0);
    const averageSurvivalSeconds = roundTo(Number(participantStats.average_survival_seconds ?? 0));

    const rooms = roomRows.map((room) => {
      const timeLimitSeconds = room.time_limit_seconds === null
        ? null
        : Number(room.time_limit_seconds);
      const elapsedSeconds = Number(room.elapsed_seconds ?? 0);
      const challengeCount = Number(room.challenge_count ?? 0);
      const triggeredChallengeCount = Number(room.triggered_challenge_count ?? 0);
      const pacePercent = timeLimitSeconds && elapsedSeconds
        ? roundTo(Math.min(timeLimitSeconds / elapsedSeconds, 1) * 100)
        : 0;

      return {
        sessionRoomId: Number(room.session_room_id),
        roomIndex: Number(room.room_index),
        roomName: room.room_name,
        roomStatus: room.status,
        difficultyLevel: Number(room.difficulty_level),
        startedAt: toIsoString(room.started_at),
        endedAt: toIsoString(room.ended_at),
        timeLimitSeconds,
        elapsedSeconds,
        pacePercent,
        challengeCount,
        triggeredChallengeCount,
        challengeTriggerRate: asPercentage(triggeredChallengeCount, challengeCount),
        eliminationCount: Number(room.elimination_count ?? 0),
        eventCount: Number(room.event_count ?? 0),
        minEliminationsToUnlock: Number(room.min_eliminations_to_unlock),
        metEliminationRequirement:
          Number(room.elimination_count ?? 0) >= Number(room.min_eliminations_to_unlock)
      };
    });

    const completedRooms = rooms.filter((room) => room.roomStatus === ROOM_STATUS.COMPLETED).length;
    const activeRooms = rooms.filter((room) => room.roomStatus === ROOM_STATUS.ACTIVE).length;
    const totalRooms = rooms.length;
    const totalChallenges = rooms.reduce((sum, room) => sum + room.challengeCount, 0);
    const totalTriggeredChallenges = rooms.reduce(
      (sum, room) => sum + room.triggeredChallengeCount,
      0
    );
    const roomsWithPace = rooms.filter((room) => room.pacePercent > 0);
    const averagePacePercent = roomsWithPace.length
      ? roundTo(roomsWithPace.reduce((sum, room) => sum + room.pacePercent, 0) / roomsWithPace.length)
      : 0;
    const completionRate = asPercentage(completedRooms, totalRooms);
    const survivalRate = asPercentage(aliveCount, totalParticipants);
    const challengeTriggerRate = asPercentage(totalTriggeredChallenges, totalChallenges);
    const overallScore = roundTo(
      (completionRate * 0.35)
      + (survivalRate * 0.25)
      + (challengeTriggerRate * 0.25)
      + (averagePacePercent * 0.15)
    );

    return {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionStatus: session.status,
      startedAt: toIsoString(session.started_at),
      endedAt: toIsoString(session.ended_at),
      elapsedSeconds: Number(session.elapsed_seconds ?? 0),
      summary: {
        overallScore,
        completionRate,
        survivalRate,
        challengeTriggerRate,
        averagePacePercent,
        totalRooms,
        completedRooms,
        activeRooms,
        totalChallenges,
        totalTriggeredChallenges,
        totalParticipants,
        aliveCount,
        eliminatedCount,
        averageSurvivalSeconds
      },
      rooms,
      eventFlow: eventRows.map((event) => ({
        eventType: event.event_type,
        count: Number(event.event_count)
      }))
    };
  } finally {
    connection.release();
  }
};

const getRoomEliminationCount = async (connection, sessionId, sessionRoomId) => {
  const [rows] = await connection.execute(
    `SELECT COUNT(DISTINCT player_id) AS elimination_count
     FROM (
       SELECT player_id
       FROM elimination
       WHERE session_id = ? AND session_room_id = ?
       UNION
       SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.player_id')) AS UNSIGNED) AS player_id
       FROM environment_event
       WHERE session_id = ?
         AND session_room_id = ?
         AND event_type = 'PlayerEliminated'
         AND JSON_EXTRACT(payload_json, '$.player_id') IS NOT NULL
     ) eliminated_players`,
    [sessionId, sessionRoomId, sessionId, sessionRoomId]
  );

  return Number(rows[0]?.elimination_count ?? 0);
};

const getRemainingPlayerCount = async (connection, sessionId) => {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS remaining_players
     FROM session_player
     WHERE session_id = ? AND is_alive = 1`,
    [sessionId]
  );

  return Number(rows[0]?.remaining_players ?? 0);
};

const getMandatoryChallengeSummary = async (connection, sessionId, sessionRoomId) => {
  const [rows] = await connection.execute(
    `SELECT
       COUNT(*) AS mandatory_count,
       SUM(CASE WHEN ev.event_id IS NULL THEN 1 ELSE 0 END) AS untriggered_mandatory_count
     FROM session_room sr
     JOIN room_challenge rc ON rc.room_id = sr.room_id
     JOIN challenge c ON c.challenge_id = rc.challenge_id
     LEFT JOIN environment_event ev
       ON ev.session_id = sr.session_id
      AND ev.session_room_id = sr.session_room_id
      AND JSON_UNQUOTE(JSON_EXTRACT(ev.payload_json, '$.challengeId')) = CAST(c.challenge_id AS CHAR)
     WHERE sr.session_id = ?
       AND sr.session_room_id = ?
       AND rc.is_mandatory = 1`,
    [sessionId, sessionRoomId]
  );

  return {
    mandatoryCount: Number(rows[0]?.mandatory_count ?? 0),
    untriggeredMandatoryCount: Number(rows[0]?.untriggered_mandatory_count ?? 0)
  };
};

const getProgressionRooms = async (connection, sessionId) => {
  const [rooms] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status,
       sr.started_at,
       sr.ended_at,
       sr.min_eliminations_to_unlock,
       sr.unlocked_next_room_at,
       r.name AS room_name,
       r.difficulty_level,
       r.time_limit_seconds,
       r.elimination_rule
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     WHERE sr.session_id = ?
     ORDER BY sr.room_index ASC`,
    [sessionId]
  );

  const enrichedRooms = [];

  for (const room of rooms) {
    const eliminationCount = await getRoomEliminationCount(
      connection,
      sessionId,
      room.session_room_id
    );
    const challengeSummary = await getMandatoryChallengeSummary(
      connection,
      sessionId,
      room.session_room_id
    );

    enrichedRooms.push({
      sessionRoomId: Number(room.session_room_id),
      roomId: Number(room.room_id),
      roomIndex: Number(room.room_index),
      roomName: room.room_name,
      roomStatus: room.status,
      startedAt: toIsoString(room.started_at),
      endedAt: toIsoString(room.ended_at),
      unlockedNextRoomAt: toIsoString(room.unlocked_next_room_at),
      difficultyLevel: Number(room.difficulty_level),
      timeLimitSeconds: room.time_limit_seconds === null ? null : Number(room.time_limit_seconds),
      eliminationRule: room.elimination_rule,
      minEliminationsToUnlock: Number(room.min_eliminations_to_unlock),
      eliminationCount,
      mandatoryChallengeCount: challengeSummary.mandatoryCount,
      untriggeredMandatoryChallengeCount: challengeSummary.untriggeredMandatoryCount,
      canUnlockNextRoom:
        eliminationCount >= Number(room.min_eliminations_to_unlock)
        && challengeSummary.untriggeredMandatoryCount === 0
    });
  }

  return enrichedRooms;
};

export const getLevelProgression = async (sessionId) => {
  const connection = await pool.getConnection();

  try {
    const session = await findGameSession(connection, sessionId);

    if (!session) {
      return null;
    }

    const rooms = await getProgressionRooms(connection, sessionId);
    const remainingPlayers = await getRemainingPlayerCount(connection, sessionId);

    return {
      sessionId: Number(session.session_id),
      sessionCode: session.session_code,
      sessionStatus: session.status,
      currentRoom: rooms.find((room) => room.roomStatus === ROOM_STATUS.ACTIVE) ?? null,
      nextLockedRoom: rooms.find((room) => room.roomStatus === ROOM_STATUS.LOCKED) ?? null,
      remainingPlayers,
      rooms
    };
  } finally {
    connection.release();
  }
};

const findCurrentProgressionRoom = async (connection, sessionId, sessionRoomId) => {
  if (sessionRoomId) {
    const [rows] = await connection.execute(
      `SELECT
         sr.session_room_id,
         sr.session_id,
         sr.room_id,
         sr.room_index,
         sr.status,
         sr.min_eliminations_to_unlock,
         r.name AS room_name
       FROM session_room sr
       JOIN room r ON r.room_id = sr.room_id
       WHERE sr.session_id = ? AND sr.session_room_id = ?
       LIMIT 1`,
      [sessionId, sessionRoomId]
    );

    return rows[0] ?? null;
  }

  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status,
       sr.min_eliminations_to_unlock,
       r.name AS room_name
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     WHERE sr.session_id = ? AND sr.status = ?
     ORDER BY sr.room_index ASC
     LIMIT 1`,
    [sessionId, ROOM_STATUS.ACTIVE]
  );

  return rows[0] ?? null;
};

const findNextProgressionRoom = async (connection, sessionId, currentRoomIndex) => {
  const [rows] = await connection.execute(
    `SELECT
       sr.session_room_id,
       sr.session_id,
       sr.room_id,
       sr.room_index,
       sr.status,
       r.name AS room_name
     FROM session_room sr
     JOIN room r ON r.room_id = sr.room_id
     WHERE sr.session_id = ? AND sr.room_index > ?
     ORDER BY sr.room_index ASC
     LIMIT 1`,
    [sessionId, currentRoomIndex]
  );

  return rows[0] ?? null;
};

export const progressToNextLevel = async (sessionId, options = {}) => {
  const sessionRoomId = asPositiveInteger(options.sessionRoomId);
  const managerId = asPositiveInteger(options.managerId);
  const force = options.force === true;
  const triggeredBy = managerId ? "Manager" : "System";
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const session = await findGameSession(connection, sessionId);

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (![SESSION_STATUS.ACTIVE, SESSION_STATUS.PAUSED].includes(session.status)) {
      throw createHttpError("Only active or paused sessions can progress levels.", 409);
    }

    const currentRoom = await findCurrentProgressionRoom(connection, sessionId, sessionRoomId);

    if (!currentRoom) {
      throw createHttpError("No active room was found for level progression.", 404);
    }

    if (currentRoom.status !== ROOM_STATUS.ACTIVE) {
      throw createHttpError("Only the active room can be progressed.", 409);
    }

    const eliminationCount = await getRoomEliminationCount(
      connection,
      sessionId,
      currentRoom.session_room_id
    );
    const minEliminationsToUnlock = Number(currentRoom.min_eliminations_to_unlock);
    const challengeSummary = await getMandatoryChallengeSummary(
      connection,
      sessionId,
      currentRoom.session_room_id
    );

    if (!force && challengeSummary.untriggeredMandatoryCount > 0) {
      throw createHttpError("All mandatory room challenges must be triggered before level progression.", 409);
    }

    if (!force && eliminationCount < minEliminationsToUnlock) {
      throw createHttpError("The room has not met its elimination requirement for level progression.", 409);
    }

    const nextRoom = await findNextProgressionRoom(
      connection,
      sessionId,
      currentRoom.room_index
    );
    const remainingPlayers = await getRemainingPlayerCount(connection, sessionId);

    await connection.execute(
      `UPDATE session_room
       SET status = ?, ended_at = COALESCE(ended_at, NOW())
       WHERE session_room_id = ?`,
      [ROOM_STATUS.COMPLETED, currentRoom.session_room_id]
    );

    await connection.execute(
      `INSERT INTO environment_event (
         session_id,
         session_room_id,
         event_type,
         payload_json,
         triggered_by,
         triggered_by_manager_id
       )
       VALUES (?, ?, 'RoomCompleted', ?, ?, ?)`,
      [
        sessionId,
        currentRoom.session_room_id,
        JSON.stringify({
          roomIndex: Number(currentRoom.room_index),
          roomName: currentRoom.room_name,
          eliminationCount,
          remainingPlayers
        }),
        triggeredBy,
        managerId
      ]
    );

    if (!nextRoom) {
      await connection.execute(
        `UPDATE game_session
         SET status = 'Finished',
             ended_at = COALESCE(ended_at, NOW()),
             timer_status = CASE WHEN timer_status = ? THEN ? ELSE timer_status END
         WHERE session_id = ?`,
        [TIMER_STATUS.RUNNING, TIMER_STATUS.STOPPED, sessionId]
      );

      const [eventResult] = await connection.execute(
        `INSERT INTO environment_event (
           session_id,
           session_room_id,
           event_type,
           payload_json,
           triggered_by,
           triggered_by_manager_id
         )
         VALUES (?, ?, 'LevelProgressionUpdate', ?, ?, ?)`,
        [
          sessionId,
          currentRoom.session_room_id,
          JSON.stringify({
            completedRoom: Number(currentRoom.room_index),
            nextRoom: null,
            sessionFinished: true,
            remainingPlayers
          }),
          triggeredBy,
          managerId
        ]
      );

      await connection.commit();

      return {
        eventId: Number(eventResult.insertId),
        sessionId,
        sessionFinished: true,
        completedRoom: {
          sessionRoomId: Number(currentRoom.session_room_id),
          roomIndex: Number(currentRoom.room_index),
          roomName: currentRoom.room_name
        },
        nextRoom: null,
        remainingPlayers
      };
    }

    await connection.execute(
      `UPDATE session_room
       SET unlocked_next_room_at = COALESCE(unlocked_next_room_at, NOW())
       WHERE session_room_id = ?`,
      [currentRoom.session_room_id]
    );

    await connection.execute(
      `UPDATE session_room
       SET status = ?,
           started_at = COALESCE(started_at, NOW())
       WHERE session_room_id = ?`,
      [ROOM_STATUS.ACTIVE, nextRoom.session_room_id]
    );

    await connection.execute(
      `INSERT INTO environment_event (
         session_id,
         session_room_id,
         event_type,
         payload_json,
         triggered_by,
         triggered_by_manager_id
       )
       VALUES (?, ?, 'DoorUnlocked', ?, ?, ?)`,
      [
        sessionId,
        nextRoom.session_room_id,
        JSON.stringify({
          previousRoomIndex: Number(currentRoom.room_index),
          nextRoomIndex: Number(nextRoom.room_index),
          nextRoomName: nextRoom.room_name
        }),
        "System",
        null
      ]
    );

    const [eventResult] = await connection.execute(
      `INSERT INTO environment_event (
         session_id,
         session_room_id,
         event_type,
         payload_json,
         triggered_by,
         triggered_by_manager_id
       )
       VALUES (?, ?, 'LevelProgressionUpdate', ?, ?, ?)`,
      [
        sessionId,
        nextRoom.session_room_id,
        JSON.stringify({
          completedRoom: Number(currentRoom.room_index),
          currentRoom: Number(nextRoom.room_index),
          remainingPlayers,
          force
        }),
        triggeredBy,
        managerId
      ]
    );

    await connection.commit();

    return {
      eventId: Number(eventResult.insertId),
      sessionId,
      sessionFinished: false,
      completedRoom: {
        sessionRoomId: Number(currentRoom.session_room_id),
        roomIndex: Number(currentRoom.room_index),
        roomName: currentRoom.room_name
      },
      nextRoom: {
        sessionRoomId: Number(nextRoom.session_room_id),
        roomIndex: Number(nextRoom.room_index),
        roomName: nextRoom.room_name,
        roomStatus: ROOM_STATUS.ACTIVE
      },
      remainingPlayers
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
