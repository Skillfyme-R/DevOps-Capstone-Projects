import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  userId: string | null
  orgId: string | null
  email: string | null
  role: string | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => void
  logout: () => void
}

interface LoginPayload {
  token: string
  user_id: string
  org_id: string
  email?: string
  role: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      orgId: null,
      email: null,
      role: null,
      isAuthenticated: false,

      login: (payload) =>
        set({
          token: payload.token,
          userId: payload.user_id,
          orgId: payload.org_id,
          email: payload.email ?? null,
          role: payload.role,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          userId: null,
          orgId: null,
          email: null,
          role: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'nexaflow-auth' }
  )
)
