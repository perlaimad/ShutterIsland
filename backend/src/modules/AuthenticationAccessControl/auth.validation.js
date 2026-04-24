const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,64}$/;
const ACCESS_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const normalizeStaffIdentifier = (identifier) => {
  const normalizedIdentifier = String(identifier ?? "").trim();

  if (!normalizedIdentifier) {
    throw createValidationError("Identifier and password are required.");
  }

  if (normalizedIdentifier.length > 255) {
    throw createValidationError("Staff identifier is too long.");
  }

  const isEmail = normalizedIdentifier.includes("@");

  if (isEmail && !EMAIL_PATTERN.test(normalizedIdentifier)) {
    throw createValidationError("Staff identifier must be a valid email or username.");
  }

  if (!isEmail && !USERNAME_PATTERN.test(normalizedIdentifier)) {
    throw createValidationError("Staff identifier must be a valid email or username.");
  }

  return isEmail ? normalizedIdentifier.toLowerCase() : normalizedIdentifier;
};

export const normalizePassword = (password) => {
  if (typeof password !== "string" || password.length === 0) {
    throw createValidationError("Identifier and password are required.");
  }

  if (password.length > 128) {
    throw createValidationError("Password is too long.");
  }

  return password;
};

export const normalizeViewerAccessKey = (accessKey) => {
  const normalizedAccessKey = String(accessKey ?? "").trim();

  if (!normalizedAccessKey) {
    throw createValidationError("Viewer access key is required.");
  }

  if (!ACCESS_KEY_PATTERN.test(normalizedAccessKey)) {
    throw createValidationError("Viewer access key format is invalid.");
  }

  return normalizedAccessKey;
};

export const normalizeOptionalViewerIdentifier = (viewerIdentifier) => {
  const normalizedViewerIdentifier = String(viewerIdentifier ?? "").trim();

  if (!normalizedViewerIdentifier) {
    return "";
  }

  if (normalizedViewerIdentifier.length > 255) {
    throw createValidationError("Viewer identifier is too long.");
  }

  const isEmail = normalizedViewerIdentifier.includes("@");

  if (isEmail && !EMAIL_PATTERN.test(normalizedViewerIdentifier)) {
    throw createValidationError("Viewer identifier must be a valid email or username.");
  }

  if (!isEmail && !USERNAME_PATTERN.test(normalizedViewerIdentifier)) {
    throw createValidationError("Viewer identifier must be a valid email or username.");
  }

  return isEmail ? normalizedViewerIdentifier.toLowerCase() : normalizedViewerIdentifier;
};
