import { Router } from "express";
import {
  getSessionTimer,
  pauseSessionTimer,
  resumeSessionTimer,
  startSessionTimer,
  stopSessionTimer
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
