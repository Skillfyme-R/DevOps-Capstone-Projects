import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, registerTokenGetter } from '../api/client';
import type { TokenResponse } from '../api/types';

// sessionStorage over localStorage: tokens die with the tab, shrinking the XSS persistence window
// for an ops console where a stolen long-lived token could pause/terminate production pipelines.
const ACCESS_KEY = 'pulsar.accessToken';
const REFRESH_KEY = 'pulsar.refreshToken';
const USERNAME_KEY = 'pulsar.username';

interface AuthState {
  username: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function persistTokens(tokens: TokenResponse, username: string) {
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem(ACCESS_KEY));
  const [username, setUsername] = useState<string | null>(() => sessionStorage.getItem(USERNAME_KEY));

  useEffect(() => {
    registerTokenGetter(() => sessionStorage.getItem(ACCESS_KEY));
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const tokens = await authApi.login({ username: user, password });
    persistTokens(tokens, user);
    setAccessToken(tokens.accessToken);
    setUsername(user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    setAccessToken(null);
    setUsername(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ username, accessToken, isAuthenticated: accessToken !== null, login, logout }),
    [username, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
