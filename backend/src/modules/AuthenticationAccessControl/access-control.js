export const AUTH_ROLES = Object.freeze({
  ADMINISTRATOR: "Administrator",
  STAFF: "Staff",
  VIEWER: "Viewer"
});

export const AUTH_PERMISSIONS = Object.freeze({
  SYSTEM_ADMIN: "system:admin",
  STAFF_READ: "staff:read",
  STAFF_MANAGE: "staff:manage",
  SESSION_READ: "session:read",
  SESSION_MANAGE: "session:manage",
  GAME_STATE_READ: "game-state:read",
  GAME_STATE_MANAGE: "game-state:manage",
  MONITORING_READ: "monitoring:read",
  REPORT_READ: "report:read",
  STREAM_READ: "stream:read",
  STREAM_MANAGE: "stream:manage",
  VIEWER_ACCESS_MANAGE: "viewer-access:manage",
  BET_PLACE: "bet:place"
});

export const ROLE_PERMISSIONS = Object.freeze({
  [AUTH_ROLES.ADMINISTRATOR]: Object.freeze([
    AUTH_PERMISSIONS.SYSTEM_ADMIN,
    AUTH_PERMISSIONS.STAFF_READ,
    AUTH_PERMISSIONS.STAFF_MANAGE,
    AUTH_PERMISSIONS.SESSION_READ,
    AUTH_PERMISSIONS.SESSION_MANAGE,
    AUTH_PERMISSIONS.GAME_STATE_READ,
    AUTH_PERMISSIONS.GAME_STATE_MANAGE,
    AUTH_PERMISSIONS.MONITORING_READ,
    AUTH_PERMISSIONS.REPORT_READ,
    AUTH_PERMISSIONS.STREAM_READ,
    AUTH_PERMISSIONS.STREAM_MANAGE,
    AUTH_PERMISSIONS.VIEWER_ACCESS_MANAGE
  ]),
  [AUTH_ROLES.STAFF]: Object.freeze([
    AUTH_PERMISSIONS.SESSION_READ,
    AUTH_PERMISSIONS.SESSION_MANAGE,
    AUTH_PERMISSIONS.GAME_STATE_READ,
    AUTH_PERMISSIONS.GAME_STATE_MANAGE,
    AUTH_PERMISSIONS.MONITORING_READ,
    AUTH_PERMISSIONS.REPORT_READ,
    AUTH_PERMISSIONS.STREAM_READ
  ]),
  [AUTH_ROLES.VIEWER]: Object.freeze([
    AUTH_PERMISSIONS.STREAM_READ,
    AUTH_PERMISSIONS.BET_PLACE
  ])
});

export const getPermissionsForRole = (role) => ROLE_PERMISSIONS[role] ?? [];

export const roleHasPermission = (role, permission) =>
  getPermissionsForRole(role).includes(permission);

export const roleHasEveryPermission = (role, permissions) =>
  permissions.every((permission) => roleHasPermission(role, permission));

export const roleHasAnyPermission = (role, permissions) =>
  permissions.some((permission) => roleHasPermission(role, permission));
