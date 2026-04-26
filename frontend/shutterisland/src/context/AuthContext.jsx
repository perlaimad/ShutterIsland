import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearStoredAuth,
  createAuthorizedFetch,
  getStoredAuth,
  loginStaff,
  registerStaff,
  saveStoredAuth,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const applyAuth = useCallback((nextAuth, remember = true) => {
    saveStoredAuth(nextAuth, remember);
    setAuth(nextAuth);
  }, []);

  const login = useCallback(async ({ identifier, password, remember }) => {
    const result = await loginStaff({ identifier, password });
    applyAuth(result, remember);
    return result;
  }, [applyAuth]);

  const register = useCallback(async ({ username, email, password }) => {
    const result = await registerStaff({ username, email, password });
    applyAuth(result, true);
    return result;
  }, [applyAuth]);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  const authFetch = useMemo(
    () => createAuthorizedFetch(auth?.token, logout),
    [auth?.token, logout],
  );

  const value = useMemo(() => ({
    auth,
    staff: auth?.staff ?? null,
    token: auth?.token ?? "",
    isAuthenticated: Boolean(auth?.token && auth?.staff),
    login,
    register,
    logout,
    authFetch,
  }), [auth, authFetch, login, logout, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
