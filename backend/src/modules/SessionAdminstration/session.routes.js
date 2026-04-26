import { Router } from "express";
import { AUTH_PERMISSIONS } from "../AuthenticationAccessControl/access-control.js";
import {
  authenticateStaff,
  authorizeAnyPermission
} from "../AuthenticationAccessControl/auth.middleware.js";
import {
  createSession,
  deleteSession,
  getSessionById,
  listSessions,
  pauseSession,
  resumeSession,
  terminateSession,
  updateSession
} from "./session.service.js";

export const sessionAdministrationRouter = Router();

const requireSessionRead = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_READ, AUTH_PERMISSIONS.SESSION_MANAGE)
];

const requireSessionManage = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_MANAGE)
];

const parseSessionId = (value) => {
  const sessionId = Number(value);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
};

const sendError = (res, error, fallbackMessage) => {
  return res.status(error.statusCode ?? 500).json({
    message: error.message ?? fallbackMessage
  });
};

sessionAdministrationRouter.get("/sessions", async (req, res) => {
  try {
    const sessions = await listSessions({
      month: req.query?.month
    });

    return res.json({ sessions });
  } catch (error) {
    return sendError(res, error, "Failed to load sessions.");
  }
});

sessionAdministrationRouter.post("/session-administration/sessions", requireSessionManage, async (req, res) => {
  try {
    const session = await createSession({
      ...(req.body ?? {}),
      createdByManagerId: req.staff.id
    });
    return res.status(201).json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to create session.");
  }
});

sessionAdministrationRouter.patch("/session-administration/sessions/:sessionId", requireSessionManage, async (req, res) => {
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

sessionAdministrationRouter.delete("/session-administration/sessions/:sessionId", requireSessionManage, async (req, res) => {
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
  requireSessionManage,
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
  requireSessionManage,
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
  requireSessionManage,
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

sessionAdministrationRouter.get("/session-administration/sessions/:sessionId", requireSessionRead, async (req, res) => {
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