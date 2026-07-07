import { useState } from 'react'
import {
  Settings, User, Bell, Shield, Database,
  Globe, Save, Eye, EyeOff, CheckCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

type Tab = 'profile' | 'notifications' | 'security' | 'integrations' | 'system'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'profile',       label: 'Profile',       Icon: User      },
  { key: 'notifications', label: 'Notifications',  Icon: Bell      },
  { key: 'security',      label: 'Security',       Icon: Shield    },
  { key: 'integrations',  label: 'Integrations',   Icon: Globe     },
  { key: 'system',        label: 'System',         Icon: Database  },
]

function SavedBanner({ message = 'Changes saved successfully' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-sm font-medium">
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}

// ─── Profile state types ──────────────────────────────────────────────────────
interface ProfileState {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  timezone: string
}

interface NotifState {
  shipment_updates: boolean
  low_stock_alerts: boolean
  order_confirmations: boolean
  fleet_exceptions: boolean
  daily_digest: boolean
  marketing: boolean
}

// ─── Tab components (receive state + setters as props) ────────────────────────

function ProfileTab({
  state, setState,
}: {
  state: ProfileState
  setState: (s: ProfileState) => void
}) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      {saved && <SavedBanner />}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
            <input
              className="input"
              value={state.firstName}
              onChange={(e) => setState({ ...state, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
            <input
              className="input"
              value={state.lastName}
              onChange={(e) => setState({ ...state, lastName: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
          <input
            className="input"
            type="email"
            value={state.email}
            onChange={(e) => setState({ ...state, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Title</label>
          <input
            className="input"
            value={state.jobTitle}
            onChange={(e) => setState({ ...state, jobTitle: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
          <select
            className="input"
            value={state.timezone}
            onChange={(e) => setState({ ...state, timezone: e.target.value })}
          >
            <option value="America/New_York">America/New York (EST)</option>
            <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
            <option value="America/Chicago">America/Chicago (CST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          </select>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationsTab({
  state, setState,
}: {
  state: NotifState
  setState: (s: NotifState) => void
}) {
  const [saved, setSaved] = useState(false)

  const toggle = (key: keyof NotifState) => setState({ ...state, [key]: !state[key] })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const items: { key: keyof NotifState; label: string; desc: string }[] = [
    { key: 'shipment_updates',    label: 'Shipment Status Updates',   desc: 'Get notified when shipment status changes' },
    { key: 'low_stock_alerts',    label: 'Low Stock Alerts',          desc: 'Alert when inventory drops below reorder point' },
    { key: 'order_confirmations', label: 'Order Confirmations',       desc: 'Receive confirmation when orders are placed' },
    { key: 'fleet_exceptions',    label: 'Fleet Exceptions',          desc: 'Alerts for vehicle breakdowns or route deviations' },
    { key: 'daily_digest',        label: 'Daily Operations Digest',   desc: 'Summary email of daily logistics activity' },
    { key: 'marketing',           label: 'Product Updates',           desc: 'News and tips about NexaFlow features' },
  ]

  return (
    <div className="space-y-5">
      {saved && <SavedBanner />}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">Notification Preferences</h3>
        <div className="divide-y divide-gray-50">
          {items.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className={`relative w-10 h-6 rounded-full transition-colors ${state[key] ? 'bg-cyan-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${state[key] ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}

function SecurityTab() {
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saved, setSaved]     = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      {saved && <SavedBanner />}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">Change Password</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Current Password</label>
          <div className="relative">
            <input className="input pr-10" type={showOld ? 'text' : 'password'} placeholder="Enter current password" />
            <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">New Password</label>
          <div className="relative">
            <input className="input pr-10" type={showNew ? 'text' : 'password'} placeholder="Enter new password" />
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm New Password</label>
          <input className="input" type="password" placeholder="Confirm new password" />
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="btn-primary">
            <Shield className="w-4 h-4" /> Update Password
          </button>
        </div>
      </div>
      <div className="card space-y-3">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">API Access</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">API Token</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">nxf_••••••••••••••••••••••••••••••••</p>
          </div>
          <button className="btn-secondary text-xs py-1.5 px-3">Regenerate</button>
        </div>
      </div>
    </div>
  )
}

function IntegrationsTab({
  state, setState,
}: {
  state: Record<string, boolean>
  setState: (s: Record<string, boolean>) => void
}) {
  const [lastChanged, setLastChanged] = useState<string | null>(null)

  const toggle = (name: string) => {
    const next = { ...state, [name]: !state[name] }
    setState(next)
    setLastChanged(name)
    setTimeout(() => setLastChanged(null), 2500)
  }

  const INTEGRATIONS = [
    { name: 'FedEx API',   desc: 'Real-time tracking and rate quoting'     },
    { name: 'UPS API',     desc: 'Carrier integration for shipment booking' },
    { name: 'Shopify',     desc: 'E-commerce order sync'                    },
    { name: 'SAP ERP',     desc: 'Enterprise resource planning sync'        },
    { name: 'Slack',       desc: 'Alert and notification delivery'          },
    { name: 'Google Maps', desc: 'Address geocoding and route display'      },
  ]

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">Connected Services</h3>
        <div className="divide-y divide-gray-50">
          {INTEGRATIONS.map((item) => {
            const connected = state[item.name]
            return (
              <div key={item.name} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  {lastChanged === item.name && (
                    <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                      {connected ? '✓ Connected' : '✓ Disconnected'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {connected
                    ? <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" /> Connected</span>
                    : <span className="badge badge-neutral">Not connected</span>
                  }
                  <button
                    onClick={() => toggle(item.name)}
                    className={connected ? 'btn-secondary text-xs py-1.5 px-3' : 'btn-primary text-xs py-1.5 px-3'}
                  >
                    {connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SystemTab() {
  const [cacheCleared, setCacheCleared] = useState(false)
  const [exporting, setExporting]       = useState(false)
  const [exported, setExported]         = useState(false)

  const clearCache = () => {
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 3000)
  }

  const exportData = () => {
    setExporting(true)
    setTimeout(() => {
      const data = { exported_at: new Date().toISOString(), org_id: 'org1', note: 'NexaFlow data export' }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `nexaflow-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExporting(false)
      setExported(true)
      setTimeout(() => setExported(false), 3000)
    }, 800)
  }

  return (
    <div className="space-y-4">
      {cacheCleared && <SavedBanner message="Cache cleared successfully" />}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">System Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Platform Version', value: 'NexaFlow v1.0.0'           },
            { label: 'Environment',      value: 'Development (Mock)'         },
            { label: 'API Base URL',     value: 'http://localhost:8086'      },
            { label: 'Organization ID',  value: 'org1'                       },
            { label: 'Database',         value: 'PostgreSQL 16 (Port 5440)'  },
            { label: 'Cache',            value: 'Redis 7 (Port 6385)'        },
            { label: 'Metrics',          value: 'Prometheus (Port 9093)'     },
            { label: 'Dashboards',       value: 'Grafana (Port 3007)'        },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-800 mt-0.5 font-mono text-xs">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card space-y-3">
        <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-3">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Clear All Cache</p>
            <p className="text-xs text-gray-400">Flush Redis cache and force data reload</p>
          </div>
          <button
            onClick={clearCache}
            className="btn-secondary text-xs py-1.5 px-3 text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            {cacheCleared ? '✓ Cleared' : 'Clear Cache'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Export All Data</p>
            <p className="text-xs text-gray-400">Download a full JSON export of your data</p>
          </div>
          <button onClick={exportData} disabled={exporting} className="btn-secondary text-xs py-1.5 px-3">
            {exporting ? 'Exporting…' : exported ? '✓ Downloaded' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page — owns all persistent state ────────────────────────────────────

export function SettingsPage() {
  const { email } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // All mutable settings state lives here so switching tabs never resets it
  const [profile, setProfile] = useState<ProfileState>({
    firstName: 'Admin',
    lastName:  'User',
    email:     email ?? 'admin@nexaflow.io',
    jobTitle:  'Logistics Operations Manager',
    timezone:  'America/New_York',
  })

  const [notifs, setNotifs] = useState<NotifState>({
    shipment_updates:    true,
    low_stock_alerts:    true,
    order_confirmations: true,
    fleet_exceptions:    true,
    daily_digest:        false,
    marketing:           false,
  })

  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    'FedEx API':   true,
    'UPS API':     true,
    'Shopify':     false,
    'SAP ERP':     false,
    'Slack':       false,
    'Google Maps': true,
  })

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account and platform preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === key ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile'       && <ProfileTab       state={profile}       setState={setProfile}       />}
          {activeTab === 'notifications' && <NotificationsTab state={notifs}        setState={setNotifs}        />}
          {activeTab === 'security'      && <SecurityTab />}
          {activeTab === 'integrations'  && <IntegrationsTab  state={integrations}  setState={setIntegrations}  />}
          {activeTab === 'system'        && <SystemTab />}
        </div>
      </div>
    </div>
  )
}
