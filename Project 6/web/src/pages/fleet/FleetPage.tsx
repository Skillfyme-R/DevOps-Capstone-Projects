import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Search, MapPin, Zap, Fuel, X } from 'lucide-react'
import { fetchVehicles, createVehicle } from '../../services/api'

interface Vehicle {
  id: string
  registration_no: string
  fleet_code: string
  make: string
  model: string
  year: number
  vehicle_type: string
  status: string
  payload_capacity_kg: number
  volume_capacity_m3: number
  fuel_type: string
  current_location?: string
  odometer_km: number
  is_active: boolean
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  available:   { label: 'Available',   cls: 'badge-success' },
  on_route:    { label: 'On Route',    cls: 'badge-info' },
  maintenance: { label: 'Maintenance', cls: 'badge-warning' },
  off_duty:    { label: 'Off Duty',    cls: 'badge-neutral' },
}

const VEHICLE_ICONS: Record<string, string> = {
  truck: '🚛',
  van:   '🚐',
  bike:  '🏍️',
  drone: '🚁',
}

function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: unknown) => createVehicle(payload),
    onSuccess: () => { onCreated(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      registration_no:      fd.get('registration_no'),
      fleet_code:           fd.get('fleet_code'),
      make:                 fd.get('make'),
      model:                fd.get('model'),
      year:                 Number(fd.get('year')),
      vehicle_type:         fd.get('vehicle_type'),
      fuel_type:            fd.get('fuel_type'),
      payload_capacity_kg:  Number(fd.get('payload_capacity_kg')),
      volume_capacity_m3:   Number(fd.get('volume_capacity_m3')),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Add Vehicle</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Registration No.</label>
                  <input name="registration_no" required className="input" placeholder="e.g. NXF-TRK-010" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Fleet Code</label>
                  <input name="fleet_code" required className="input" placeholder="e.g. T-010" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Make</label>
                  <input name="make" required className="input" placeholder="e.g. Volvo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Model</label>
                  <input name="model" required className="input" placeholder="e.g. FH16" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                  <input name="year" required type="number" min="2000" max="2030" className="input" placeholder="2024" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                  <select name="vehicle_type" className="input">
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="bike">Bike</option>
                    <option value="drone">Drone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Fuel Type</label>
                  <select name="fuel_type" className="input">
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="petrol">Petrol</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Payload (kg)</label>
                  <input name="payload_capacity_kg" required type="number" min="1" className="input" placeholder="e.g. 18000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Volume (m³)</label>
                  <input name="volume_capacity_m3" required type="number" min="1" className="input" placeholder="e.g. 80" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Adding…' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function FleetPage() {
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['fleet'],
    queryFn: fetchVehicles,
    staleTime: 0,
  })

  const vehicles: Vehicle[] = data?.items ?? []
  const filtered = vehicles.filter((v) => {
    const matchStatus = filterStatus ? v.status === filterStatus : true
    const matchSearch = search.trim()
      ? v.registration_no.toLowerCase().includes(search.toLowerCase()) ||
        v.fleet_code.toLowerCase().includes(search.toLowerCase()) ||
        `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase())
      : true
    return matchStatus && matchSearch
  })

  const statusCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Fleet Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''} in your fleet`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Status summary */}
      {!isLoading && vehicles.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, { label, cls }]) => (
            <button
              key={key}
              onClick={() => setFilter(filterStatus === key ? '' : key)}
              className={`stat-card text-left transition-all ${filterStatus === key ? 'ring-2 ring-cyan-400' : ''}`}
            >
              <span className={`badge ${cls} self-start`}>{label}</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statusCounts[key] ?? 0}</p>
              <p className="text-xs text-gray-400">vehicles</p>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search registration, code or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left">
              {['Vehicle', 'Type', 'Status', 'Location', 'Capacity', 'Fuel', 'Odometer'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Truck className="w-10 h-10 mx-auto mb-3 opacity-25" />
                    <p className="font-medium text-gray-500">No vehicles found</p>
                    <p className="text-xs mt-1">
                      {search || filterStatus ? 'Clear filters to see all vehicles' : 'Add your first vehicle to get started'}
                    </p>
                  </td>
                </tr>
              )
              : filtered.map((v) => {
                const statusCfg = STATUS_CONFIG[v.status] ?? { label: v.status, cls: 'badge-neutral' }
                return (
                  <tr key={v.id} className="table-row-hover">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{VEHICLE_ICONS[v.vehicle_type] ?? '🚗'}</span>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">
                            {v.make} {v.model} <span className="text-gray-400">'{String(v.year).slice(-2)}</span>
                          </p>
                          <p className="font-mono text-xs text-cyan-600">{v.fleet_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 capitalize">{v.vehicle_type}</td>
                    <td className="px-4 py-3.5">
                      <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {v.current_location ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{v.current_location}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      <div>{(v.payload_capacity_kg || 0).toLocaleString()} kg</div>
                      <div className="text-gray-400">{v.volume_capacity_m3} m³</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {v.fuel_type === 'electric'
                          ? <Zap className="w-3 h-3 text-cyan-500" />
                          : <Fuel className="w-3 h-3" />}
                        <span className="capitalize">{v.fuel_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {(v.odometer_km || 0).toLocaleString()} km
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddVehicleModal
          onClose={() => setShowModal(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['fleet'] })}
        />
      )}
    </div>
  )
}
