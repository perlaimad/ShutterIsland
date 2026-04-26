import { Router } from "express";
import { authenticateStaff, authenticateViewer } from "./auth.middleware.js";
import { loginStaff, registerStaff } from "./auth.service.js";
import { loginViewer } from "./viewer.service.js";
import { AUTH_PERMISSIONS, AUTH_ROLES, ROLE_PERMISSIONS } from "./access-control.js";

export const authenticationAccessControlRouter = Router();

const handleStaffRegistration = async (req, res) => {
  try {
    const result = await registerStaff({
      username: req.body?.username,
      email: req.body?.email,
      password: req.body?.password
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Staff registration failed."
    });
  }
};

authenticationAccessControlRouter.post("/auth/register", handleStaffRegistration);
authenticationAccessControlRouter.post("/auth/staff/register", handleStaffRegistration);

const handleStaffLogin = async (req, res) => {
  try {
    const result = await loginStaff({
      identifier: req.body?.identifier ?? req.body?.username ?? req.body?.email,
      password: req.body?.password
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Staff login failed."
    });
  }
};

authenticationAccessControlRouter.post("/auth/login", handleStaffLogin);
authenticationAccessControlRouter.post("/auth/staff/login", handleStaffLogin);

authenticationAccessControlRouter.get("/auth/staff/me", authenticateStaff, (req, res) => {
  res.json({ staff: req.staff });
});

authenticationAccessControlRouter.get("/auth/staff/access-control", authenticateStaff, (req, res) => {
  res.json({
    actorType: "staff",
    role: req.staff.role,
    permissions: req.staff.permissions
  });
});

authenticationAccessControlRouter.post("/auth/viewer/login", async (req, res) => {
  try {
    const result = await loginViewer({
      accessKey: req.body?.accessKey ?? req.body?.access_key,
      viewerIdentifier: req.body?.viewerIdentifier ?? req.body?.viewer_identifier
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      message: error.message ?? "Viewer login failed."
    });
  }
});

authenticationAccessControlRouter.get("/auth/viewer/me", authenticateViewer, (req, res) => {
  res.json({ viewer: req.viewer });
});

authenticationAccessControlRouter.get("/auth/viewer/access-control", authenticateViewer, (req, res) => {
  res.json({
    actorType: "viewer",
    role: req.viewer.role,
    permissions: req.viewer.permissions
  });
});

authenticationAccessControlRouter.get("/auth/access-control/roles", (_req, res) => {
  res.json({
    roles: AUTH_ROLES,
    permissions: AUTH_PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS
  });
});
