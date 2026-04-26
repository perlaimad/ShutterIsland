const API_ORIGIN = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const AUTH_STORAGE_KEY = "shutterisland.auth";

const parseStoredAuth = (value) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed?.token && parsed?.staff ? parsed : null;
  } catch {
    return null;
  }
};

export const getStoredAuth = () =>
  parseStoredAuth(window.localStorage.getItem(AUTH_STORAGE_KEY)) ??
  parseStoredAuth(window.sessionStorage.getItem(AUTH_STORAGE_KEY));

export const saveStoredAuth = (auth, remember = true) => {
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;

  other.removeItem(AUTH_STORAGE_KEY);
  target.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
};

export const clearStoredAuth = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
};

const authRequest = async (path, body) => {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message ?? `Authentication request failed (${response.status}).`);
  }

  return data;
};

export const loginStaff = ({ identifier, password }) =>
  authRequest("/api/auth/login", { identifier, password });

export const registerStaff = ({ username, email, password }) =>
  authRequest("/api/auth/register", { username, email, password });

export const createAuthorizedFetch = (token, onUnauthorized) => async (url, options = {}) => {
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    onUnauthorized?.();
  }

  return response;
};
