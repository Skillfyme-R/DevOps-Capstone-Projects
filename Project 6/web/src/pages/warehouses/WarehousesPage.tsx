import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Warehouse, Plus, Search, MapPin, Package, CheckCircle, XCircle, X } from 'lucide-react'
import { fetchWarehouses, createWarehouse } from '../../services/api'

interface WarehouseItem {
  id: string
  name: string
  code: string
  type: string
  address_line_1: string
  city: string
  state: string
  country: string
  total_area_sq_m: number
  usable_area_sq_m: number
  is_active: boolean
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  fulfillment:  'Fulfillment',
  cross_dock:   'Cross-Dock',
  cold_storage: 'Cold Storage',
  returns:      'Returns',
}

function AddWarehouseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: unknown) => createWarehouse(payload),
    onSuccess: () => { onCreated(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      name:             fd.get('name'),
      code:             fd.get('code'),
      type:             fd.get('type'),
      address_line_1:   fd.get('address_line_1'),
      city:             fd.get('city'),
      state:            fd.get('state'),
      country:          fd.get('country') || 'US',
      total_area_sq_m:  Number(fd.get('total_area_sq_m')),
      usable_area_sq_m: Number(fd.get('usable_area_sq_m')),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Add Warehouse</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Warehouse Name</label>
                <input name="name" required className="input" placeholder="e.g. North Hub Distribution Center" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Code</label>
                  <input name="code" required className="input" placeholder="e.g. NHD-01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                  <select name="type" className="input">
                    <option value="fulfillment">Fulfillment</option>
                    <option value="cross_dock">Cross-Dock</option>
                    <option value="cold_storage">Cold Storage</option>
                    <option value="returns">Returns</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Street Address</label>
                <input name="address_line_1" required className="input" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                  <input name="city" required className="input" placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">State</label>
                  <input name="state" required className="input" placeholder="State" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                  <input name="country" className="input" placeholder="US" defaultValue="US" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Total Area (m²)</label>
                  <input name="total_area_sq_m" required type="number" min="1" className="input" placeholder="e.g. 25000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Usable Area (m²)</label>
                  <input name="usable_area_sq_m" required type="number" min="1" className="input" placeholder="e.g. 22000" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Adding…' : 'Add Warehouse'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function WarehousesPage() {
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchWarehouses(),
    staleTime: 0,
  })

  const warehouses: WarehouseItem[] = data?.items ?? []
  const filtered = search.trim()
    ? warehouses.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.code.toLowerCase().includes(search.toLowerCase()) ||
          w.city.toLowerCase().includes(search.toLowerCase()),
      )
    : warehouses

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Warehouses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${warehouses.length} facilit${warehouses.length !== 1 ? 'ies' : 'y'} across your network`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      {/* Stats */}
      {!isLoading && warehouses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Facilities', value: warehouses.length, Icon: Warehouse,   color: 'text-navy-900',   bg: 'bg-slate-100'  },
            { label: 'Active',           value: warehouses.filter(w => w.is_active).length, Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Area',       value: `${(warehouses.reduce((s, w) => s + (w.total_area_sq_m || 0), 0) / 1000).toFixed(0)}k m²`, Icon: Package, color: 'text-cyan-700', bg: 'bg-cyan-50' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className={`self-start p-2.5 rounded-lg ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
              <p className="text-sm font-medium text-gray-700">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, code or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-20 text-gray-400" />
          <p className="font-medium text-gray-500">No warehouses found</p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Add your first warehouse to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <div key={w.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{w.name}</p>
                  <p className="text-xs font-mono text-cyan-600 mt-0.5">{w.code}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="badge badge-neutral">{TYPE_LABELS[w.type] ?? w.type}</span>
                  {w.is_active
                    ? <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                    : <span className="badge badge-error gap-1"><XCircle className="w-3 h-3" /> Inactive</span>
                  }
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-500 mb-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{w.address_line_1}, {w.city}, {w.state} · {w.country}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                <span>Total: <strong className="text-gray-700">{(w.total_area_sq_m || 0).toLocaleString()} m²</strong></span>
                <span>Usable: <strong className="text-gray-700">{(w.usable_area_sq_m || 0).toLocaleString()} m²</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddWarehouseModal
          onClose={() => setShowModal(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['warehouses'] })}
        />
      )}
    </div>
  )
}
