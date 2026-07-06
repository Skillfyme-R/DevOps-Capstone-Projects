import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useApolloClient, gql } from '@apollo/client'

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      role
      avatarUrl
      account { id name slug tier }
      subscriptions { id status plan { id name slug } }
    }
  }
`

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
  account?: { id: string; name: string; slug: string; tier: string }
  subscriptions: Array<{ id: string; status: string; plan: { id: string; name: string; slug: string } }>
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  login: (token: string, user: CurrentUser) => void
  logout: () => void
  refetchUser: () => Promise<void>
  isAuthenticated: boolean
  hasActiveSubscription: boolean
  isPlatformAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const apolloClient = useApolloClient()

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('fluxstream_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' })
      if (data?.me) {
        setUser(data.me)
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [apolloClient])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback((token: string, userData: CurrentUser) => {
    localStorage.setItem('fluxstream_token', token)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fluxstream_token')
    setUser(null)
    apolloClient.clearStore()
  }, [apolloClient])

  const refetchUser = useCallback(async () => {
    await fetchUser()
  }, [fetchUser])

  const hasActiveSubscription = user?.subscriptions?.some(
    (s) => ['active', 'trialing', 'ACTIVE', 'TRIALING'].includes(s.status)
  ) ?? false

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      refetchUser,
      isAuthenticated: !!user,
      hasActiveSubscription,
      isPlatformAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
