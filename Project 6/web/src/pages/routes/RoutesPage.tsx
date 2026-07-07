import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Navigation, Play, MapPin, Clock, Fuel,
  Leaf, Plus, ChevronRight, X, Loader2,
} from 'lucide-react'
import { optimizeRoute } from '../../services/api'

interface Stop {
  name: string
  latitude: string
  longitude: string
}

interface OptimizedRoute {
  route_id: string
  mode: string
  optimised_stops: Stop[]
  total_distance_km: number
  estimated_hours: number
  fuel_estimate_liters: number
  co2_estimate_kg: number
}

interface SavedRoute {
  route_id: string
  mode: string
  optimised_stops: Stop[]
  total_distance_km: number
  estimated_hours: number
  fuel_estimate_liters: number
  co2_estimate_kg: number
  created_at: string
}

function OptimizeModal({ onClose, onSave }: { onClose: () => void; onSave: (r: SavedRoute) => void }) {
  const [stops, setStops] = useState<Stop[]>([
    { name: '', latitude: '', longitude: '' },
    { name: '', latitude: '', longitude: '' },
  ])
  const [mode, setMode] = useState('fastest')
  const [result, setResult] = useState<OptimizedRoute | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      optimizeRoute({
        stops: stops.map((s) => ({
          name: s.name,
          latitude: parseFloat(s.latitude) || 0,
          longitude: parseFloat(s.longitude) || 0,
        })),
        mode,
        vehicle_id: 'v3',
      }),
    onSuccess: (data) => { setResult(data); onSave({ ...data, created_at: new Date().toISOString() }) },
  })

  const addStop = () => setStops((prev) => [...prev, { name: '', latitude: '', longitude: '' }])
  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i))
  const updateStop = (i: number, field: keyof Stop, value: string) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Optimize Route</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {!result ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Optimization Mode</label>
                  <div className="flex gap-2">
                    {['fastest', 'shortest', 'eco'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                          mode === m
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-600">Stops</label>
                  {stops.map((stop, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <input
                          className="input text-xs"
                          placeholder={i === 0 ? 'Origin name' : i === stops.length - 1 ? 'Destination name' : `Stop ${i + 1} name`}
                          value={stop.name}
                          onChange={(e) => updateStop(i, 'name', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="input text-xs"
                            placeholder="Latitude"
                            value={stop.latitude}
                            onChange={(e) => updateStop(i, 'latitude', e.target.value)}
                          />
                          <input
                            className="input text-xs"
                            placeholder="Longitude"
                            value={stop.longitude}
                            onChange={(e) => updateStop(i, 'longitude', e.target.value)}
                          />
                        </div>
                      </div>
                      {stops.length > 2 && (
                        <button
                          onClick={() => removeStop(i)}
                          className="mt-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addStop} className="btn-secondary text-xs py-1.5 w-full justify-center">
                    <Plus className="w-3.5 h-3.5" /> Add Stop
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Navigation className="w-4 h-4" />
                  Route Optimized Successfully
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Distance',  value: `${result.total_distance_km} km`,        Icon: MapPin },
                    { label: 'Est. Time', value: `${result.estimated_hours} h`,            Icon: Clock  },
                    { label: 'Fuel',      value: `${result.fuel_estimate_liters} L`,       Icon: Fuel   },
                    { label: 'CO₂',       value: `${result.co2_estimate_kg} kg`,           Icon: Leaf   },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                        <Icon className="w-3.5 h-3.5" />{label}
                      </div>
                      <p className="font-semibold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Optimised Stop Order</p>
                  <ol className="space-y-1.5">
                    {result.optimised_stops.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs flex items-center justify-center font-medium flex-shrink-0">{i + 1}</span>
                        {s.name || `Stop ${i + 1}`}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">Close</button>
            {!result && (
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="btn-primary"
              >
                {mutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</>
                  : <><Play className="w-4 h-4" /> Optimize</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function RoutesPage() {
  const [showModal, setShowModal]   = useState(false)
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])

  const avgDistance = savedRoutes.length
    ? (savedRoutes.reduce((s, r) => s + r.total_distance_km, 0) / savedRoutes.length).toFixed(1)
    : '—'

  const totalFuel = savedRoutes.reduce((s, r) => s + r.fuel_estimate_liters, 0).toFixed(1)

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Route Planning</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {savedRoutes.length > 0
              ? `${savedRoutes.length} route${savedRoutes.length !== 1 ? 's' : ''} optimized`
              : 'Optimize delivery routes with TSP algorithms'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Navigation className="w-4 h-4" />
          Optimize Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Routes Optimized', value: savedRoutes.length || '—', sub: 'this session',     color: 'text-cyan-700',    bg: 'bg-cyan-50'    },
          { label: 'Avg Distance',      value: avgDistance !== '—' ? `${avgDistance} km` : '—', sub: 'per route', color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Total Fuel Est.',   value: savedRoutes.length ? `${totalFuel} L` : '—',     sub: 'across all routes',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Route list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Optimized Routes</p>
        </div>
        <div className="divide-y divide-gray-50">
          {savedRoutes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Navigation className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-gray-500">No routes yet</p>
              <p className="text-xs mt-1">Click "Optimize Route" to plan your first delivery route</p>
            </div>
          ) : savedRoutes.map((r, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 table-row-hover">
              <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-navy-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {r.optimised_stops[0]?.name || 'Origin'} → {r.optimised_stops[r.optimised_stops.length - 1]?.name || 'Destination'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{r.optimised_stops.length} stops</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="capitalize">{r.mode}</span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 shrink-0">
                <p className="font-medium text-gray-700">{r.total_distance_km} km</p>
                <p className="text-gray-400">{r.estimated_hours} h</p>
              </div>
              <span className="badge badge-success shrink-0">optimized</span>
            </div>
          ))}
        </div>
      </div>

      {/* Optimizer CTA */}
      <div className="card bg-gradient-to-br from-navy-900 to-navy-800 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">TSP Route Optimizer</h3>
            <p className="text-navy-300 text-sm mt-1">
              Use the nearest-neighbour algorithm with Haversine distance to find the shortest path across multiple stops.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Optimizer
          </button>
        </div>
      </div>

      {showModal && (
        <OptimizeModal
          onClose={() => setShowModal(false)}
          onSave={(route) => setSavedRoutes((prev) => [route, ...prev])}
        />
      )}
    </div>
  )
}
