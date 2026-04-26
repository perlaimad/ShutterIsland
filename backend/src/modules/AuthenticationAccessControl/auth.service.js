import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";
import { AUTH_ROLES, getPermissionsForRole } from "./access-control.js";
import { createAuthToken } from "./auth.tokens.js";
import {
  normalizePassword,
  normalizeStaffIdentifier,
  normalizeStaffRegistration
} from "./auth.validation.js";

const INTERNAL_ROLES = [AUTH_ROLES.ADMINISTRATOR, AUTH_ROLES.STAFF];
const ACTIVE_STATUS = "Active";

const publicStaffFields = (staff) => ({
  id: staff.manager_id,
  username: staff.username,
  email: staff.email,
  role: staff.role,
  permissions: getPermissionsForRole(staff.role),
  status: staff.status,
  createdAt: staff.created_at,
  lastLoginAt: staff.last_login_at
});

const compareText = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const verifyScryptPassword = (password, storedHash) => {
  const [, cost, keyLength, salt, expectedHash] = storedHash.split("$");
  const derivedHash = crypto
    .scryptSync(password, salt, Number(keyLength), { N: Number(cost) })
    .toString("hex");

  return compareText(derivedHash, expectedHash);
};

const verifyPassword = async (password, storedHash) => {
  if (!password || !storedHash) {
    return false;
  }

  try {
    if (
      storedHash.startsWith("$2a$") ||
      storedHash.startsWith("$2b$") ||
      storedHash.startsWith("$2y$")
    ) {
      return bcrypt.compare(password, storedHash);
    }

    if (storedHash.startsWith("scrypt$")) {
      return verifyScryptPassword(password, storedHash);
    }

    if (storedHash.startsWith("sha256:")) {
      return compareText(sha256(password), storedHash.slice("sha256:".length));
    }

    if (/^[a-f0-9]{64}$/i.test(storedHash)) {
      return compareText(sha256(password), storedHash.toLowerCase());
    }
  } catch {
    return false;
  }

  return false;
};

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const issueStaffSession = (staff) => {
  const publicStaff = publicStaffFields(staff);
  const token = createAuthToken({
    actorType: "staff",
    managerId: staff.manager_id,
    username: staff.username,
    role: staff.role
  });

  return {
    staff: publicStaff,
    token: token.token,
    tokenType: "Bearer",
    expiresAt: token.expiresAt
  };
};

export const registerStaff = async (input) => {
  const { username, email, password } = normalizeStaffRegistration(input ?? {});
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const [result] = await pool.execute(
      `INSERT INTO manager (username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, passwordHash, AUTH_ROLES.STAFF, ACTIVE_STATUS]
    );

    const [rows] = await pool.execute(
      `SELECT manager_id, username, email, role, status, created_at, last_login_at
       FROM manager
       WHERE manager_id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return issueStaffSession(rows[0]);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
      throw createHttpError("Username or email is already registered.", 409);
    }

    throw error;
  }
};

export const loginStaff = async ({ identifier, password }) => {
  const normalizedIdentifier = normalizeStaffIdentifier(identifier);
  const normalizedPassword = normalizePassword(password);

  const [rows] = await pool.execute(
    `SELECT manager_id, username, email, password_hash, role, status, created_at, last_login_at
     FROM manager
     WHERE role IN (?, ?) AND (username = ? OR email = ?)
     LIMIT 1`,
    [AUTH_ROLES.ADMINISTRATOR, AUTH_ROLES.STAFF, normalizedIdentifier, normalizedIdentifier]
  );

  const staff = rows[0];

  if (!staff || !(await verifyPassword(normalizedPassword, staff.password_hash))) {
    const error = new Error("Invalid staff credentials.");
    error.statusCode = 401;
    throw error;
  }

  if (staff.status !== ACTIVE_STATUS) {
    const error = new Error("Staff account is not active.");
    error.statusCode = 403;
    throw error;
  }

  await pool.execute("UPDATE manager SET last_login_at = CURRENT_TIMESTAMP WHERE manager_id = ?", [
    staff.manager_id
  ]);

  const [updatedRows] = await pool.execute(
    `SELECT manager_id, username, email, role, status, created_at, last_login_at
     FROM manager
     WHERE manager_id = ?
     LIMIT 1`,
    [staff.manager_id]
  );

  return issueStaffSession(updatedRows[0] ?? staff);
};

export const getStaffById = async (managerId) => {
  const [rows] = await pool.execute(
    `SELECT manager_id, username, email, role, status, created_at, last_login_at
     FROM manager
     WHERE manager_id = ? AND role IN (?, ?)
     LIMIT 1`,
    [managerId, ...INTERNAL_ROLES]
  );

  const staff = rows[0];

  if (!staff || staff.status !== ACTIVE_STATUS) {
    return null;
  }

  return publicStaffFields(staff);
};
