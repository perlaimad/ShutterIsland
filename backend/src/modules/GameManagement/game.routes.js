import { Router } from "express";
import {
  getChallengeSequence,
  getGameEvents,
  getLevelProgression,
  getSessionTimer,
  pauseSessionTimer,
  progressToNextLevel,
  recordGameEvent,
  recordParticipantAction,
  resumeSessionTimer,
  startSessionTimer,
  stopSessionTimer,
  triggerChallengeSequence
} from "./game.service.js";

export const gameManagementRouter = Router();

const parseSessionId = (value) => {
  const sessionId = Number(value);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
};

const sendTimerResult = (res, timer) => {
  if (!timer) {
    return res.status(404).json({ message: "Session not found." });
  }

  return res.json({ timer });
};

const handleTimerAction = (action) => async (req, res) => {
  const sessionId = parseSessionId(req.params.sessionId);

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId must be a positive integer." });
  }

  try {
    const timer = await action(sessionId, req.body);
    return sendTimerResult(res, timer);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Session timer request failed."
    });
  }
};

const sendChallengeResult = (res, result) => {
  if (!result) {
    return res.status(404).json({ message: "Session not found." });
  }

  return res.json(result);
};

const handleChallengeAction = (action) => async (req, res) => {
  const sessionId = parseSessionId(req.params.sessionId);

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId must be a positive integer." });
  }

  try {
    const result = await action(sessionId, req.body, req);
    return sendChallengeResult(res, result);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Challenge sequence request failed."
    });
  }
};

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/timer",
  handleTimerAction((sessionId) => getSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/start",
  handleTimerAction((sessionId, body) => startSessionTimer(sessionId, body?.durationSeconds))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/pause",
  handleTimerAction((sessionId) => pauseSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/resume",
  handleTimerAction((sessionId) => resumeSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/stop",
  handleTimerAction((sessionId) => stopSessionTimer(sessionId))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/challenges/sequence",
  handleChallengeAction((sessionId) => getChallengeSequence(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/challenges/trigger",
  handleChallengeAction((sessionId, body) => triggerChallengeSequence(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/levels/progression",
  handleChallengeAction((sessionId) => getLevelProgression(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/levels/progress",
  handleChallengeAction((sessionId, body) => progressToNextLevel(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/events",
  handleChallengeAction((sessionId, _body, req) => getGameEvents(sessionId, req.query))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/events",
  handleChallengeAction((sessionId, body) => recordGameEvent(sessionId, body))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/participants/actions",
  handleChallengeAction((sessionId, body) => recordParticipantAction(sessionId, body))
);
