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
