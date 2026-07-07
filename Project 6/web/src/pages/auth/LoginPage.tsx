import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { login } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      loginStore(data)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 px-16 py-12 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-navy-900" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">NexaFlow</span>
        </div>
        <div className="relative z-10 mb-auto">
          <h2 className="text-4xl font-bold text-white leading-tight text-balance">
            Every shipment,<br />
            <span className="text-cyan-400">orchestrated.</span>
          </h2>
          <p className="text-navy-300 mt-4 text-lg leading-relaxed max-w-md">
            The intelligent logistics platform that gives your team real-time control
            over shipments, warehouses, fleet, and fulfilment — from a single pane of glass.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Shipments/day', value: '50K+' },
              { label: 'On-time rate', value: '98.2%' },
              { label: 'Warehouses', value: '200+' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-navy-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-navy-500 text-sm">
          © 2026 NexaFlow Logistics, Inc. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-500" strokeWidth={2.5} />
            </div>
            <span className="text-navy-900 font-bold text-xl">NexaFlow</span>
          </div>

          <h2 className="text-2xl font-semibold text-navy-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-7">Welcome back to NexaFlow</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Need access?{' '}
            <a href="mailto:support@nexaflow.io" className="text-cyan-600 hover:underline">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
