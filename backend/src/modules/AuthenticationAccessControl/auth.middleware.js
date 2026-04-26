import { verifyAuthToken } from "./auth.tokens.js";
import { getPermissionsForRole, roleHasAnyPermission, roleHasEveryPermission } from "./access-control.js";
import { getStaffById } from "./auth.service.js";
import { getViewerByAccessId } from "./viewer.service.js";

const getBearerToken = (req) => {
  const queryToken = String(req.query?.access_token ?? "").trim();
  if (queryToken) {
    return queryToken;
  }

  const parts = String(req.headers.authorization ?? "").trim().split(/\s+/);
  const [scheme, token] = parts;
  return parts.length === 2 && scheme?.toLowerCase() === "bearer" ? token : null;
};

const resolveStaffFromToken = async (token) => {
  const payload = verifyAuthToken(token);
  if (payload?.actorType !== "staff" || !payload?.managerId) {
    return null;
  }

  const staff = await getStaffById(payload.managerId);
  if (!staff) {
    return null;
  }

  return {
    actorType: "staff",
    actor: staff
  };
};

const resolveViewerFromToken = async (token) => {
  const payload = verifyAuthToken(token);
  if (payload?.actorType !== "viewer" || !payload?.accessId) {
    return null;
  }

  const viewer = await getViewerByAccessId(payload.accessId);
  if (!viewer) {
    return null;
  }

  return {
    actorType: "viewer",
    actor: viewer
  };
};

export const authenticateStaff = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Bearer token is required." });
  }

  const payload = verifyAuthToken(token);

  if (payload?.actorType !== "staff" || !payload?.managerId) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const staff = await getStaffById(payload.managerId);

    if (!staff) {
      return res.status(403).json({ message: "Staff access is required." });
    }

    req.auth = {
      actorType: "staff",
      managerId: staff.id,
      role: staff.role,
      permissions: getPermissionsForRole(staff.role)
    };
    req.staff = staff;
    return next();
  } catch (error) {
    return res.status(500).json({
      message: error.message ?? "Staff authentication failed."
    });
  }
};

export const authenticateViewer = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Bearer token is required." });
  }

  const payload = verifyAuthToken(token);

  if (payload?.actorType !== "viewer" || !payload?.accessId) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const viewer = await getViewerByAccessId(payload.accessId);

    if (!viewer) {
      return res.status(403).json({ message: "Viewer access is required." });
    }

    req.auth = {
      actorType: "viewer",
      accessId: viewer.accessId,
      role: viewer.role,
      permissions: getPermissionsForRole(viewer.role)
    };
    req.viewer = viewer;
    return next();
  } catch (error) {
    return res.status(500).json({
      message: error.message ?? "Viewer authentication failed."
    });
  }
};

export const authenticateAnyActor = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Bearer token is required." });
  }

  try {
    const staffResolution = await resolveStaffFromToken(token);
    if (staffResolution) {
      req.auth = {
        actorType: "staff",
        managerId: staffResolution.actor.id,
        role: staffResolution.actor.role,
        permissions: getPermissionsForRole(staffResolution.actor.role)
      };
      req.staff = staffResolution.actor;
      return next();
    }

    const viewerResolution = await resolveViewerFromToken(token);
    if (viewerResolution) {
      req.auth = {
        actorType: "viewer",
        accessId: viewerResolution.actor.accessId,
        role: viewerResolution.actor.role,
        permissions: getPermissionsForRole(viewerResolution.actor.role)
      };
      req.viewer = viewerResolution.actor;
      return next();
    }

    return res.status(401).json({ message: "Invalid or expired token." });
  } catch (error) {
    return res.status(500).json({
      message: error.message ?? "Authentication failed."
    });
  }
};

export const authorizeStaffRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.staff) {
    return res.status(401).json({ message: "Authenticated staff is required." });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(req.staff.role)) {
    return res.status(403).json({ message: "Insufficient permissions." });
  }

  return next();
};

export const authorizeAnyPermission = (...requiredPermissions) => (req, res, next) => {
  if (!req.auth?.role) {
    return res.status(401).json({ message: "Authenticated user is required." });
  }

  if (
    requiredPermissions.length > 0 &&
    !roleHasAnyPermission(req.auth.role, requiredPermissions)
  ) {
    return res.status(403).json({ message: "Insufficient permissions." });
  }

  return next();
};

export const authorizeAllPermissions = (...requiredPermissions) => (req, res, next) => {
  if (!req.auth?.role) {
    return res.status(401).json({ message: "Authenticated user is required." });
  }

  if (
    requiredPermissions.length > 0 &&
    !roleHasEveryPermission(req.auth.role, requiredPermissions)
  ) {
    return res.status(403).json({ message: "Insufficient permissions." });
  }

  return next();
};

export const attachAuthenticatedManager = (req, res, next) => {
  if (!req.staff?.id) {
    return res.status(401).json({ message: "Authenticated staff is required." });
  }

  req.body = {
    ...(req.body ?? {}),
    managerId: req.staff.id
  };

  return next();
};
