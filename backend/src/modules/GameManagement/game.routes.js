import { Router } from "express";
import { AUTH_PERMISSIONS } from "../AuthenticationAccessControl/access-control.js";
import {
  attachAuthenticatedManager,
  authenticateStaff,
  authorizeAnyPermission
} from "../AuthenticationAccessControl/auth.middleware.js";
import {
  assignFinalRankings,
  detectFinishConditions,
  eliminateParticipant,
  getChallengeSequence,
  getEliminations,
  getFinalRankings,
  getFinishConditions,
  getGameEvents,
  getLevelProgression,
  getPerformanceFlow,
  getSessionTimer,
  pauseSessionTimer,
  progressToNextLevel,
  recordGameEvent,
  recordParticipantAction,
  resumeSessionTimer,
  startSessionTimer,
  stopSessionTimer,
  synchronizeGameState,
  triggerChallengeSequence
} from "./game.service.js";
import { publishAdminEvent } from "../../common/realtime/sse.js";

export const gameManagementRouter = Router();

const requireGameStateRead = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.GAME_STATE_READ, AUTH_PERMISSIONS.GAME_STATE_MANAGE)
];

const requireSystemAction = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.GAME_STATE_MANAGE),
  attachAuthenticatedManager
];

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
    if (req.method === "POST" && timer) {
      publishAdminEvent({
        type: "session_timer_updated",
        sessionId,
        scope: "session",
        reason: req.path,
      });
    }
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
    if (req.method === "POST" && result) {
      publishAdminEvent({
        type: "session_state_updated",
        sessionId,
        scope: "session",
        reason: req.path,
      });
    }
    return sendChallengeResult(res, result);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Challenge sequence request failed."
    });
  }
};

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/timer",
  requireGameStateRead,
  handleTimerAction((sessionId) => getSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/start",
  requireSystemAction,
  handleTimerAction((sessionId, body) => startSessionTimer(sessionId, body?.durationSeconds))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/pause",
  requireSystemAction,
  handleTimerAction((sessionId) => pauseSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/resume",
  requireSystemAction,
  handleTimerAction((sessionId) => resumeSessionTimer(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/timer/stop",
  requireSystemAction,
  handleTimerAction((sessionId) => stopSessionTimer(sessionId))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/challenges/sequence",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getChallengeSequence(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/challenges/trigger",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => triggerChallengeSequence(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/levels/progression",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getLevelProgression(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/levels/progress",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => progressToNextLevel(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/events",
  requireGameStateRead,
  handleChallengeAction((sessionId, _body, req) => getGameEvents(sessionId, req.query))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/events",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => recordGameEvent(sessionId, body))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/participants/actions",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => recordParticipantAction(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/eliminations",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getEliminations(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/eliminations",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => eliminateParticipant(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/performance/flow",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getPerformanceFlow(sessionId))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/finish-conditions",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getFinishConditions(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/finish-conditions/detect",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => detectFinishConditions(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/final-rankings",
  requireGameStateRead,
  handleChallengeAction((sessionId) => getFinalRankings(sessionId))
);

gameManagementRouter.post(
  "/game-management/sessions/:sessionId/final-rankings/assign",
  requireSystemAction,
  handleChallengeAction((sessionId, body) => assignFinalRankings(sessionId, body))
);

gameManagementRouter.get(
  "/game-management/sessions/:sessionId/state/sync",
  requireGameStateRead,
  handleChallengeAction((sessionId, _body, req) => synchronizeGameState(sessionId, req.query))
);
