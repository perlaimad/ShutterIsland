import { Router } from "express";
import {
  checkInParticipant,
  createSession,
  deleteSession,
  getSessionById,
  listSessionParticipants,
  listSessions,
  pauseSession,
  registerParticipant,
  resumeSession,
  terminateSession,
  updateSession
} from "./session.service.js";
import {
  attachAuthenticatedManager,
  authenticateStaff,
  authorizeAnyPermission
} from "../AuthenticationAccessControl/auth.middleware.js";
import { AUTH_PERMISSIONS } from "../AuthenticationAccessControl/access-control.js";

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

const requireSessionRead = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_READ, AUTH_PERMISSIONS.SESSION_MANAGE)
];

const requireSessionManage = [
  authenticateStaff,
  authorizeAnyPermission(AUTH_PERMISSIONS.SESSION_MANAGE),
  attachAuthenticatedManager
];

sessionAdministrationRouter.get("/session-administration/sessions", ...requireSessionRead, async (req, res) => {
  try {
    const sessions = await listSessions({
      month: req.query?.month,
      status: req.query?.status
    });
    return res.json({ sessions });
  } catch (error) {
    return sendError(res, error, "Failed to list sessions.");
  }
});

sessionAdministrationRouter.post("/session-administration/sessions", ...requireSessionManage, async (req, res) => {
  try {
    req.body = {
      ...(req.body ?? {}),
      createdByManagerId: req.staff.id
    };
    const session = await createSession(req.body ?? {});
    return res.status(201).json({ session });
  } catch (error) {
    return sendError(res, error, "Failed to create session.");
  }
});

sessionAdministrationRouter.patch("/session-administration/sessions/:sessionId", ...requireSessionManage, async (req, res) => {
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

sessionAdministrationRouter.delete("/session-administration/sessions/:sessionId", ...requireSessionManage, async (req, res) => {
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
  ...requireSessionManage,
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
  ...requireSessionManage,
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
  ...requireSessionManage,
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

sessionAdministrationRouter.get("/session-administration/sessions/:sessionId", ...requireSessionRead, async (req, res) => {
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

sessionAdministrationRouter.get(
  "/session-administration/sessions/:sessionId/participants",
  ...requireSessionRead,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    try {
      const sessionParticipants = await listSessionParticipants(sessionId);

      if (!sessionParticipants) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.json(sessionParticipants);
    } catch (error) {
      return sendError(res, error, "Failed to list participants.");
    }
  }
);

sessionAdministrationRouter.post(
  "/session-administration/sessions/:sessionId/participants",
  ...requireSessionManage,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    try {
      const registration = await registerParticipant(sessionId, req.body ?? {});

      if (!registration) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.status(201).json(registration);
    } catch (error) {
      return sendError(res, error, "Failed to register participant.");
    }
  }
);

sessionAdministrationRouter.post(
  "/session-administration/sessions/:sessionId/participants/:playerId/check-in",
  ...requireSessionManage,
  async (req, res) => {
    const sessionId = parseSessionId(req.params.sessionId);
    const playerId = parseSessionId(req.params.playerId);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId must be a positive integer." });
    }

    if (!playerId) {
      return res.status(400).json({ message: "playerId must be a positive integer." });
    }

    try {
      const checkIn = await checkInParticipant(sessionId, playerId, req.body ?? {});

      if (!checkIn) {
        return res.status(404).json({ message: "Session not found." });
      }

      return res.json(checkIn);
    } catch (error) {
      return sendError(res, error, "Failed to check in participant.");
    }
  }
);
