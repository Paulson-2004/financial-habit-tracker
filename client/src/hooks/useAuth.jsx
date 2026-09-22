import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '../lib/axios.js';
import { fetchCurrentUser, loginRequest, registerRequest } from '../services/authService.js';

const AuthContext = createContext(null);

/**
 * Owns the current user and token. On mount, an existing token is validated against
 * GET /auth/me so a stale/expired token never lingers as a "logged in" client state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!tokenStorage.get()) {
        setIsLoading(false);
        return;
      }
      try {
        const current = await fetchCurrentUser();
        if (!cancelled) setUser(current);
      } catch {
        tokenStorage.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedInUser } = await loginRequest(credentials);
    tokenStorage.set(token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await registerRequest(payload);
    tokenStorage.set(token);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
