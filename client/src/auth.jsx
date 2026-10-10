import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (login, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { login, password } });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, login, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export const isStaff = (u) => u && ['hq', 'zbc', 'mauze', 'counsellor'].includes(u.role);
export const canSanction = (u) => u && ['hq', 'zbc'].includes(u.role);
export const canManage = (u) => u && ['hq', 'zbc', 'mauze'].includes(u.role);
