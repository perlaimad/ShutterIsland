import { Router } from "express";
import {
  createSession,
  deleteSession,
  getSessionById,
  pauseSession,
  resumeSession,
  terminateSession,
  updateSession
} from "./session.service.js";

export const sessionAdministrationRouter = Router();

const parseSessionId = (value) => {
  const sessionId = Number(value);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
};

const sendError = (res, error, fallbackMessage) => {
  return res.status(error.statusCode ?? 500).json({
    message: error.message ?? fallbackMessage
  });
};

// TODO: enforce admin-only access once auth middleware is integrated.

sessionAdministrationRouter.post("/session-administration/sessions", async (req, res) => {
  try {
    const session = await createSession(req.body ?? {});
    return res.status(201).json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to create session.");
  }
});

sessionAdministrationRouter.patch("/session-administration/sessions/:sessionId", async (req, res) => {
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

sessionAdministrationRouter.delete("/session-administration/sessions/:sessionId", async (req, res) => {
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

sessionAdministrationRouter.get("/session-administration/sessions/:sessionId", async (req, res) => {
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
