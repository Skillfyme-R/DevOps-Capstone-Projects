import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'clinician' | 'nurse' | 'admin' | 'superadmin';
  mfaEnabled: boolean;
  phone?: string;
}

interface AuthState { user: AuthUser | null; loading: boolean; initialized: boolean; }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: false, initialized: false });

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('mc_access_token');
    if (!token) { setState((s: AuthState) => ({ ...s, initialized: true })); return; }
    try {
      const { data } = await apiClient.get('/auth/me');
      setState({ user: data.user, loading: false, initialized: true });
    } catch {
      localStorage.removeItem('mc_access_token');
      localStorage.removeItem('mc_refresh_token');
      setState({ user: null, loading: false, initialized: true });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    setState((s: AuthState) => ({ ...s, loading: true }));
    const { data } = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('mc_access_token', data.accessToken);
    localStorage.setItem('mc_refresh_token', data.refreshToken);
    setState({ user: data.user, loading: false, initialized: true });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch (_) { /* ignore */ }
    localStorage.removeItem('mc_access_token');
    localStorage.removeItem('mc_refresh_token');
    setState({ user: null, loading: false, initialized: true });
  }, []);

  const refreshUser = useCallback(async () => { await fetchMe(); }, [fetchMe]);

  return { ...state, login, logout, refreshUser };
}
