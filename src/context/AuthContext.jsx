import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, login as loginApi, logout as logoutApi, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });

    fetchMe()
      .then((u) => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  const login = async (username, password) => {
    const u = await loginApi(username, password);
    setUser(u);
    setStatus('authenticated');
    return u;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setStatus('unauthenticated');
  };

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
