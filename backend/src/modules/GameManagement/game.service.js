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
