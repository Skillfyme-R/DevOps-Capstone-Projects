import { ReactNode, useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  Navigation,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Zap,
  X,
  CheckCheck,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/shipments',  label: 'Shipments',  icon: Package },
  { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { to: '/fleet',      label: 'Fleet',      icon: Truck },
  { to: '/routes',     label: 'Routes',     icon: Navigation },
  { to: '/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/suppliers',  label: 'Suppliers',  icon: Users },
  { to: '/analytics',  label: 'Analytics',  icon: BarChart3 },
]

interface Notification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  type: 'info' | 'warning' | 'success'
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Shipment Delayed',        body: 'NXF-A1B2C3D4 is experiencing a delivery exception.',  time: '2m ago',  read: false, type: 'warning' },
  { id: 'n2', title: 'Order Confirmed',          body: 'ORD-2026-00001 has been confirmed and is processing.', time: '15m ago', read: false, type: 'success' },
  { id: 'n3', title: 'Low Stock Alert',          body: '3 inventory items are below reorder point.',           time: '1h ago',  read: false, type: 'warning' },
  { id: 'n4', title: 'Vehicle Available',        body: 'Fleet unit T-002 has completed its route.',            time: '2h ago',  read: true,  type: 'info'    },
  { id: 'n5', title: 'New Supplier Added',       body: 'Atlas Logistics Corp has been onboarded.',             time: '3h ago',  read: true,  type: 'success' },
]

const TYPE_DOT: Record<string, string> = {
  warning: 'bg-amber-400',
  success: 'bg-emerald-400',
  info:    'bg-cyan-400',
}

function NotificationPanel({
  onClose,
  notifications,
  setNotifications,
}: {
  onClose: () => void
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
}) {
  const unread = notifications.filter((n) => !n.read).length

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  const dismiss = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id))
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          {unread > 0 && (
            <span className="text-xs bg-orange-100 text-orange-600 font-medium px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-medium px-2 py-1 rounded hover:bg-cyan-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${n.read ? 'opacity-60' : ''}`}
          >
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-gray-200' : TYPE_DOT[n.type]}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold text-gray-800 ${!n.read ? 'font-bold' : ''}`}>{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
              <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 shrink-0 self-start"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setNotifications([])}
            className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const { email, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('nexaflow_notifications')
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS
    } catch {
      return INITIAL_NOTIFICATIONS
    }
  })
  const bellRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => !n.read).length

  // Persist notification state to localStorage on every change
  useEffect(() => {
    localStorage.setItem('nexaflow_notifications', JSON.stringify(notifications))
  }, [notifications])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close panel when clicking outside
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-navy-900 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-navy-800">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-navy-900" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-white font-semibold text-base tracking-tight">NexaFlow</span>
            <span className="block text-navy-400 text-[10px] tracking-widest uppercase font-medium leading-none mt-0.5">
              Logistics OS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-navy-800 pt-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-t border-navy-800">
          <p className="text-xs text-navy-400 truncate">{email ?? 'user@nexaflow.io'}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search shipments, orders, vehicles..."
              className="input w-72 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowNotifs((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
              {showNotifs && (
                <NotificationPanel
                  onClose={() => setShowNotifs(false)}
                  notifications={notifications}
                  setNotifications={setNotifications}
                />
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
