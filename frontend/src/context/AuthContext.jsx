import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, clearTokens, extractErrorMessage, setTokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const hasToken = !!localStorage.getItem("access_token");
    if (!hasToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [loadMe]);

  const login = useCallback(async (username, password) => {
    try {
      const { data } = await api.post("/auth/login/", { username, password });
      setTokens({ access: data.access, refresh: data.refresh });
      await loadMe();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, "Invalid username or password.") };
    }
  }, [loadMe]);

  const register = useCallback(async (username, email, password) => {
    try {
      await api.post("/auth/register/", { username, email, password });
      return login(username, password);
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, "Could not create account.") };
    }
  }, [login]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
