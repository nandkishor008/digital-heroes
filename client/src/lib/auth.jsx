import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, subscription: null, charity: null });
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setState({ user: null, subscription: null, charity: null });
      setLoading(false);
      return null;
    }
    try {
      const data = await api.get('/auth/me');
      setState({ user: data.user, subscription: data.subscription, charity: data.charity });
      return data;
    } catch (err) {
      setToken(null);
      setState({ user: null, subscription: null, charity: null });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    await refresh();
    return data.user;
  }, [refresh]);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setToken(data.token);
    await refresh();
    return data.user;
  }, [refresh]);

  const logout = useCallback(() => {
    setToken(null);
    setState({ user: null, subscription: null, charity: null });
  }, []);

  const value = useMemo(() => ({
    ...state,
    loading,
    isSubscribed: Boolean(state.subscription),
    isAdmin: state.user?.role === 'admin',
    login, register, logout, refresh,
  }), [state, loading, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
