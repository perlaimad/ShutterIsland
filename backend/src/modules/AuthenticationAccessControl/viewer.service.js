import { pool } from "../../config/db.js";
import { AUTH_ROLES, getPermissionsForRole } from "./access-control.js";
import { createAuthToken } from "./auth.tokens.js";
import {
  normalizeOptionalViewerIdentifier,
  normalizeViewerAccessKey
} from "./auth.validation.js";

const ACTIVE_ACCESS_STATUS = "Active";
const VIEWABLE_STREAM_STATUSES = new Set(["Live", "Paused"]);

const publicViewerFields = (viewerAccess) => ({
  accessId: viewerAccess.access_id,
  viewerIdentifier: viewerAccess.viewer_identifier,
  role: AUTH_ROLES.VIEWER,
  permissions: getPermissionsForRole(AUTH_ROLES.VIEWER),
  accessStatus: viewerAccess.access_status,
  issuedAt: viewerAccess.issued_at,
  expiresAt: viewerAccess.expires_at,
  lastUsedAt: viewerAccess.last_used_at,
  stream: {
    id: viewerAccess.stream_id,
    sessionId: viewerAccess.session_id,
    status: viewerAccess.stream_status,
    url: viewerAccess.stream_url,
    encryptionMode: viewerAccess.encryption_mode,
    startedAt: viewerAccess.started_at,
    endedAt: viewerAccess.ended_at
  }
});

const isExpired = (expiresAt) => Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());

const loadViewerAccess = async ({ accessId, accessKey }) => {
  const filters = [];
  const values = [];

  if (accessId) {
    filters.push("vak.access_id = ?");
    values.push(accessId);
  }

  if (accessKey) {
    filters.push("vak.access_key = ?");
    values.push(accessKey);
  }

  if (filters.length === 0) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT
       vak.access_id,
       vak.stream_id,
       vak.viewer_identifier,
       vak.access_status,
       vak.issued_at,
       vak.expires_at,
       vak.last_used_at,
       ls.session_id,
       ls.stream_status,
       ls.stream_url,
       ls.encryption_mode,
       ls.started_at,
       ls.ended_at
     FROM viewer_access_key vak
     INNER JOIN live_stream ls ON ls.stream_id = vak.stream_id
     WHERE ${filters.join(" AND ")}
     LIMIT 1`,
    values
  );

  return rows[0] ?? null;
};

const assertViewerAccessAllowed = (viewerAccess) => {
  if (!viewerAccess) {
    const error = new Error("Invalid viewer access key.");
    error.statusCode = 401;
    throw error;
  }

  if (viewerAccess.access_status !== ACTIVE_ACCESS_STATUS || isExpired(viewerAccess.expires_at)) {
    const error = new Error("Viewer access key is not active.");
    error.statusCode = 403;
    throw error;
  }

  if (!VIEWABLE_STREAM_STATUSES.has(viewerAccess.stream_status)) {
    const error = new Error("Live stream is not available for viewing.");
    error.statusCode = 403;
    throw error;
  }
};

export const loginViewer = async ({ accessKey, viewerIdentifier }) => {
  const normalizedAccessKey = normalizeViewerAccessKey(accessKey);
  const normalizedViewerIdentifier = normalizeOptionalViewerIdentifier(viewerIdentifier);

  const viewerAccess = await loadViewerAccess({ accessKey: normalizedAccessKey });
  assertViewerAccessAllowed(viewerAccess);

  if (
    normalizedViewerIdentifier &&
    normalizedViewerIdentifier.toLowerCase() !== viewerAccess.viewer_identifier.toLowerCase()
  ) {
    const error = new Error("Viewer identifier does not match this access key.");
    error.statusCode = 403;
    throw error;
  }

  await pool.execute("UPDATE viewer_access_key SET last_used_at = CURRENT_TIMESTAMP WHERE access_id = ?", [
    viewerAccess.access_id
  ]);

  const updatedViewerAccess = await loadViewerAccess({ accessId: viewerAccess.access_id });
  const publicViewer = publicViewerFields(updatedViewerAccess ?? viewerAccess);
  const token = createAuthToken({
    actorType: "viewer",
    accessId: viewerAccess.access_id,
    streamId: viewerAccess.stream_id,
    sessionId: viewerAccess.session_id,
    viewerIdentifier: viewerAccess.viewer_identifier
  });

  return {
    viewer: publicViewer,
    token: token.token,
    tokenType: "Bearer",
    expiresAt: token.expiresAt
  };
};

export const getViewerByAccessId = async (accessId) => {
  const viewerAccess = await loadViewerAccess({ accessId });

  try {
    assertViewerAccessAllowed(viewerAccess);
  } catch {
    return null;
  }

  return publicViewerFields(viewerAccess);
};
