import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { services, setUnauthorizedHandler, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    window.location.assign('/login');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    });

    const token = tokenStore.get();
    if (!token) {
      setInitialising(false);
      return undefined;
    }

    services.auth
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setInitialising(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await services.auth.login(email, password);
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await services.auth.register(payload);
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      initialising,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, initialising, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
