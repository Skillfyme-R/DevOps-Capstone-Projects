/**
 * useAuth — Authentication Hook
 *
 * Manages the user's login state using Zustand (global state).
 * This hook can be called from any component to:
 *   - Check if the user is logged in
 *   - Get the current user's info
 *   - Log in / Log out
 *
 * State is kept in memory (Zustand store) and persisted in localStorage.
 * On page reload, we check localStorage to restore the session.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // Saves state to localStorage automatically
import { api } from '../utils/apiClient';

export interface AuthUser {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  roles:     string[];
  kycLevel:  number;
}

interface AuthState {
  user:          AuthUser | null;
  isAuthenticated: boolean;
  isLoading:     boolean;

  // Actions
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  fetchMe: () => Promise<void>;
}

interface RegisterData {
  email:     string;
  password:  string;
  firstName: string;
  lastName:  string;
  phone?:    string;
}

// Zustand store with persistence to localStorage
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      isAuthenticated: false,
      isLoading:       false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post<{
            user: AuthUser;
            accessToken: string;
            refreshToken: string;
          }>('/auth/login', { email, password });

          // Store tokens in localStorage (access token is short-lived)
          localStorage.setItem('nexus_access_token',  data.accessToken);
          localStorage.setItem('nexus_refresh_token', data.refreshToken);

          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error; // Let the form handle the error display
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          // Always clear local state even if the API call fails
          localStorage.removeItem('nexus_access_token');
          localStorage.removeItem('nexus_refresh_token');
          set({ user: null, isAuthenticated: false });
          window.location.href = '/login';
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{
            user: AuthUser;
            accessToken: string;
            refreshToken: string;
          }>('/auth/register', data);

          localStorage.setItem('nexus_access_token',  response.accessToken);
          localStorage.setItem('nexus_refresh_token', response.refreshToken);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchMe: async () => {
        const token = localStorage.getItem('nexus_access_token');
        if (!token) return;
        try {
          const user = await api.get<AuthUser>('/auth/me');
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name:    'nexus-auth',       // localStorage key
      partialize: (state) => ({    // Only persist these fields (not functions)
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
