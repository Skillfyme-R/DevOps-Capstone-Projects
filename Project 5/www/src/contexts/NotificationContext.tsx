import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface AppNotification {
  id: string
  type: 'subscription' | 'system' | 'new'
  title: string
  body: string
  time: string
  read: boolean
}

interface NotifContextValue {
  notifications: AppNotification[]
  push: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotifContext = createContext<NotifContextValue | null>(null)

const INITIAL: AppNotification[] = [
  { id: 'w1', type: 'new', title: 'Welcome to FluxStream', body: 'Start exploring thousands of movies, series and documentaries.', time: 'just now', read: false },
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL)

  const push = useCallback((n: Omit<AppNotification, 'id' | 'time' | 'read'>) => {
    const notif: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      time: 'just now',
      read: false,
    }
    setNotifications(prev => [notif, ...prev])
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  return (
    <NotifContext.Provider value={{ notifications, push, markRead, markAllRead }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifications(): NotifContextValue {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
