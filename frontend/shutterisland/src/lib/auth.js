const AUTH_STORAGE_KEY = "shutterisland-auth";

export const saveAuthSession = (session) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const loadAuthSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getAuthHeaders = () => {
  const session = loadAuthSession();
  if (!session?.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.token}`
  };
};
