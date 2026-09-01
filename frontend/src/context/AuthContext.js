import React, { createContext, useContext, useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fixitz_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("fixitz_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("fixitz_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("fixitz_token", data.token);
    setUser(data.user);
    return data.user;
  };

  // Exchange a Firebase Google ID token for a session token + user.
  const loginFirebase = async (idToken) => {
    const { data } = await api.post("/auth/firebase", { id_token: idToken });
    localStorage.setItem("fixitz_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const completeProfile = async (phone) => {
    const { data } = await api.post("/auth/complete-profile", { phone });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    localStorage.removeItem("fixitz_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, loginFirebase, completeProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { apiErr };
