import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import api from '../services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('accessToken');
      delete api.defaults.headers.common.Authorization;
    }
  }, []);

  const clearAuth = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    const me = data?.data?.user || null;
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        if (!token) {
          setLoading(false);
          return;
        }

        applyToken(token);
        await fetchMe();
      } catch (error) {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [applyToken, fetchMe, clearAuth]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedInUser } = data.data;

    applyToken(accessToken);
    setUser(loggedInUser);

    return loggedInUser;
  }, [applyToken]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    try {
      return await fetchMe();
    } catch (error) {
      clearAuth();
      return null;
    }
  }, [fetchMe, clearAuth]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      updateUser,
      loading,
      login,
      logout,
      refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isEmployee: user?.role === 'employee',
      mustChangePassword: !!user?.mustChangePassword,
    }),
    [user, loading, login, logout, refreshUser, updateUser]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};