import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Search, Filter, X } from 'lucide-react'
import { fetchShipments, createShipment } from '../../services/api'
import { format } from 'date-fns'

const STATUSES = ['', 'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled']

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:           'badge-neutral',
    picked_up:         'badge-info',
    in_transit:        'badge-info',
    out_for_delivery:  'badge-warning',
    delivered:         'badge-success',
    exception:         'badge-error',
    cancelled:         'badge-neutral',
  }
  return <span className={`badge ${styles[status] ?? 'badge-neutral'}`}>{status.replace(/_/g, ' ')}</span>
}

function NewShipmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: unknown) => createShipment(payload),
    onSuccess: () => { onCreated(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      destination_address: fd.get('destination_address'),
      carrier_code:        fd.get('carrier_code'),
      service_level:       fd.get('service_level'),
      weight_kg:           Number(fd.get('weight_kg')),
      volume_m3:           Number(fd.get('volume_m3')),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">New Shipment</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Destination Address</label>
                <input name="destination_address" required className="input" placeholder="Full delivery address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Carrier</label>
                  <select name="carrier_code" className="input">
                    <option value="FEDEX">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="DHL">DHL</option>
                    <option value="USPS">USPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Service Level</label>
                  <select name="service_level" className="input">
                    <option value="express">Express</option>
                    <option value="standard">Standard</option>
                    <option value="economy">Economy</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Weight (kg)</label>
                  <input name="weight_kg" required type="number" step="0.1" min="0" className="input" placeholder="e.g. 5.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Volume (m³)</label>
                  <input name="volume_m3" required type="number" step="0.01" min="0" className="input" placeholder="e.g. 0.05" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Creating…' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function ShipmentsPage() {
  const [status, setStatus]       = useState('')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(0)
  const [showModal, setShowModal] = useState(false)
  const limit = 20

  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', status, page],
    queryFn: () => fetchShipments({ status, limit, offset: page * limit }),
  })

  const shipments: any[] = data?.items ?? []
  const total: number    = data?.total ?? 0

  const filtered = search.trim()
    ? shipments.filter((s) => s.tracking_number?.toLowerCase().includes(search.toLowerCase()))
    : shipments

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Shipments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} shipments tracked
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          New Shipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tracking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0) }}
            className="input w-auto"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === '' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left">
              {['Tracking #', 'Status', 'Origin', 'Destination', 'Carrier', 'Weight', 'Est. Delivery', 'Updated'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No shipments found</p>
                  </td>
                </tr>
              )
              : filtered.map((s) => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-600 font-medium">
                    {s.tracking_number}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.origin_warehouse_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-[160px] truncate">{s.destination_address}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.carrier_code || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.weight_kg ? `${s.weight_kg} kg` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.estimated_delivery ? format(new Date(s.estimated_delivery), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(new Date(s.updated_at), 'MMM d, HH:mm')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="btn-secondary py-1 px-3 text-xs"
              >Previous</button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="btn-secondary py-1 px-3 text-xs"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewShipmentModal
          onClose={() => setShowModal(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['shipments'] })}
        />
      )}
    </div>
  )
}
