import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { app } from "../../app.js";
import {
  AUTH_PERMISSIONS,
  AUTH_ROLES,
  getPermissionsForRole,
  roleHasAnyPermission,
  roleHasEveryPermission
} from "./access-control.js";
import { createAuthToken, verifyAuthToken } from "./auth.tokens.js";
import { attachAuthenticatedManager } from "./auth.middleware.js";
import {
  normalizeOptionalViewerIdentifier,
  normalizePassword,
  normalizeStaffIdentifier,
  normalizeViewerAccessKey
} from "./auth.validation.js";

let server;
let baseUrl;

const request = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("AuthenticationAccessControl tokens", () => {
  it("creates and verifies a staff auth token", () => {
    const { token, tokenType, expiresAt } = {
      ...createAuthToken({
        actorType: "staff",
        managerId: 3,
        username: "staff_lina",
        role: "Staff"
      }),
      tokenType: "Bearer"
    };

    const payload = verifyAuthToken(token);

    assert.equal(tokenType, "Bearer");
    assert.equal(typeof token, "string");
    assert.equal(typeof expiresAt, "string");
    assert.equal(payload.actorType, "staff");
    assert.equal(payload.managerId, 3);
    assert.equal(payload.username, "staff_lina");
    assert.equal(payload.role, "Staff");
  });

  it("creates and verifies a viewer auth token", () => {
    const { token } = createAuthToken({
      actorType: "viewer",
      accessId: 3,
      streamId: 2,
      sessionId: 2,
      viewerIdentifier: "viewer3@example.com"
    });

    const payload = verifyAuthToken(token);

    assert.equal(payload.actorType, "viewer");
    assert.equal(payload.accessId, 3);
    assert.equal(payload.streamId, 2);
    assert.equal(payload.sessionId, 2);
    assert.equal(payload.viewerIdentifier, "viewer3@example.com");
  });

  it("rejects a tampered token", () => {
    const { token } = createAuthToken({
      actorType: "staff",
      managerId: 3,
      username: "staff_lina",
      role: "Staff"
    });

    assert.equal(verifyAuthToken(`${token}tampered`), null);
  });
});

describe("AuthenticationAccessControl RBAC", () => {
  it("grants administrators full internal control permissions", () => {
    assert.equal(
      roleHasEveryPermission(AUTH_ROLES.ADMINISTRATOR, [
        AUTH_PERMISSIONS.SYSTEM_ADMIN,
        AUTH_PERMISSIONS.STAFF_MANAGE,
        AUTH_PERMISSIONS.SESSION_MANAGE,
        AUTH_PERMISSIONS.GAME_STATE_MANAGE,
        AUTH_PERMISSIONS.VIEWER_ACCESS_MANAGE
      ]),
      true
    );
  });

  it("allows staff operational permissions but not system administration", () => {
    assert.equal(roleHasAnyPermission(AUTH_ROLES.STAFF, [AUTH_PERMISSIONS.SESSION_MANAGE]), true);
    assert.equal(roleHasAnyPermission(AUTH_ROLES.STAFF, [AUTH_PERMISSIONS.SYSTEM_ADMIN]), false);
    assert.equal(roleHasAnyPermission(AUTH_ROLES.STAFF, [AUTH_PERMISSIONS.STAFF_MANAGE]), false);
  });

  it("limits viewers to stream viewing and betting permissions", () => {
    assert.deepEqual(getPermissionsForRole(AUTH_ROLES.VIEWER), [
      AUTH_PERMISSIONS.STREAM_READ,
      AUTH_PERMISSIONS.BET_PLACE
    ]);
    assert.equal(roleHasAnyPermission(AUTH_ROLES.VIEWER, [AUTH_PERMISSIONS.SESSION_MANAGE]), false);
  });
});

describe("AuthenticationAccessControl validation", () => {
  it("accepts staff email and username identifiers", () => {
    assert.equal(normalizeStaffIdentifier(" Staff_Lina-01 "), "Staff_Lina-01");
    assert.equal(normalizeStaffIdentifier("LINA@SHUTTERISLAND.COM"), "lina@shutterisland.com");
  });

  it("rejects malformed staff identifiers", () => {
    assert.throws(
      () => normalizeStaffIdentifier("bad username with spaces"),
      /Staff identifier must be a valid email or username/
    );
    assert.throws(
      () => normalizeStaffIdentifier("bad-email@"),
      /Staff identifier must be a valid email or username/
    );
  });

  it("validates staff password presence and size", () => {
    assert.equal(normalizePassword("Staff123!"), "Staff123!");
    assert.throws(() => normalizePassword(""), /Identifier and password are required/);
    assert.throws(() => normalizePassword("x".repeat(129)), /Password is too long/);
  });

  it("accepts Phase III viewer access key format", () => {
    assert.equal(normalizeViewerAccessKey(" KEY-SES102-B1 "), "KEY-SES102-B1");
  });

  it("rejects malformed viewer access keys", () => {
    assert.throws(() => normalizeViewerAccessKey(""), /Viewer access key is required/);
    assert.throws(
      () => normalizeViewerAccessKey("bad key with spaces"),
      /Viewer access key format is invalid/
    );
    assert.throws(
      () => normalizeViewerAccessKey("x".repeat(121)),
      /Viewer access key format is invalid/
    );
  });

  it("validates optional viewer identifiers", () => {
    assert.equal(normalizeOptionalViewerIdentifier(""), "");
    assert.equal(normalizeOptionalViewerIdentifier("VIEWER3@EXAMPLE.COM"), "viewer3@example.com");
    assert.throws(
      () => normalizeOptionalViewerIdentifier("bad viewer"),
      /Viewer identifier must be a valid email or username/
    );
  });
});

describe("AuthenticationAccessControl routes", () => {
  it("returns 400 when staff login credentials are missing", async () => {
    const response = await request("/api/auth/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Identifier and password are required.");
  });

  it("requires a bearer token for the staff profile route", async () => {
    const response = await request("/api/auth/staff/me");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Bearer token is required.");
  });

  it("returns 401 for malformed authorization headers", async () => {
    const response = await request("/api/auth/staff/me", {
      headers: { Authorization: "Token not-a-bearer-token" }
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Bearer token is required.");
  });

  it("returns 401 for tampered staff tokens", async () => {
    const { token } = createAuthToken({
      actorType: "staff",
      managerId: 3,
      username: "staff_lina",
      role: "Staff"
    });

    const response = await request("/api/auth/staff/me", {
      headers: { Authorization: `Bearer ${token}tampered` }
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token.");
  });

  it("rejects viewer tokens on staff-only routes", async () => {
    const { token } = createAuthToken({
      actorType: "viewer",
      accessId: 3,
      streamId: 2,
      sessionId: 2,
      viewerIdentifier: "viewer3@example.com"
    });

    const response = await request("/api/auth/staff/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token.");
  });

  it("returns 400 when staff identifier format is invalid", async () => {
    const response = await request("/api/auth/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "bad identifier",
        password: "Staff123!"
      })
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Staff identifier must be a valid email or username.");
  });

  it("returns 400 when viewer access key is missing", async () => {
    const response = await request("/api/auth/viewer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Viewer access key is required.");
  });

  it("requires a bearer token for the viewer profile route", async () => {
    const response = await request("/api/auth/viewer/me");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Bearer token is required.");
  });

  it("rejects staff tokens on viewer-only routes", async () => {
    const { token } = createAuthToken({
      actorType: "staff",
      managerId: 3,
      username: "staff_lina",
      role: "Staff"
    });

    const response = await request("/api/auth/viewer/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token.");
  });

  it("returns 400 when viewer access key format is invalid", async () => {
    const response = await request("/api/auth/viewer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessKey: "bad key with spaces",
        viewerIdentifier: "viewer3@example.com"
      })
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Viewer access key format is invalid.");
  });

  it("returns 400 when viewer identifier format is invalid", async () => {
    const response = await request("/api/auth/viewer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessKey: "KEY-SES102-B1",
        viewerIdentifier: "bad viewer"
      })
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Viewer identifier must be a valid email or username.");
  });

  it("returns 400 for malformed JSON login bodies", async () => {
    const response = await request("/api/auth/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Invalid JSON request body.");
  });

  it("exposes the configured role-permission matrix", async () => {
    const response = await request("/api/auth/access-control/roles");

    assert.equal(response.status, 200);
    assert.equal(response.body.roles.ADMINISTRATOR, AUTH_ROLES.ADMINISTRATOR);
    assert.equal(
      response.body.rolePermissions.Administrator.includes(AUTH_PERMISSIONS.SYSTEM_ADMIN),
      true
    );
    assert.equal(response.body.rolePermissions.Viewer.includes(AUTH_PERMISSIONS.BET_PLACE), true);
  });

  it("protects game-management routes behind staff/admin RBAC", async () => {
    const response = await request("/api/game-management/sessions/1/timer");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Bearer token is required.");
  });

  it("rejects unauthenticated system-changing game-management actions", async () => {
    const response = await request("/api/game-management/sessions/1/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationSeconds: 300 })
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Bearer token is required.");
  });

  it("rejects viewer tokens on internal system-changing actions", async () => {
    const { token } = createAuthToken({
      actorType: "viewer",
      accessId: 3,
      streamId: 2,
      sessionId: 2,
      viewerIdentifier: "viewer3@example.com"
    });

    const response = await request("/api/game-management/sessions/1/timer/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ durationSeconds: 300 })
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token.");
  });

  it("overwrites client-supplied managerId with the authenticated staff id", () => {
    const req = {
      staff: { id: 42 },
      body: { managerId: 999, durationSeconds: 300 }
    };
    const res = {};
    let nextCalled = false;

    attachAuthenticatedManager(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.body, {
      managerId: 42,
      durationSeconds: 300
    });
  });
});
