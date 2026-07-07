import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Search, Star, Mail, X } from 'lucide-react'
import { fetchSuppliers, createSupplier } from '../../services/api'

interface Supplier {
  id: string
  name: string
  code: string
  tier: string
  category: string
  contact_name: string
  contact_email: string
  contact_phone: string
  city: string
  country: string
  lead_time_days: number
  rating_score: number
  is_active: boolean
}

const TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  premium:   { label: 'Premium',   cls: 'badge-error' },
  preferred: { label: 'Preferred', cls: 'badge-warning' },
  standard:  { label: 'Standard',  cls: 'badge-neutral' },
}

const CATEGORY_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  carrier:      'Carrier',
  distributor:  'Distributor',
  '3pl':        '3PL',
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(score) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{score.toFixed(1)}</span>
    </div>
  )
}

function AddSupplierModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: unknown) => createSupplier(payload),
    onSuccess: () => { onCreated(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      name:           fd.get('name'),
      code:           fd.get('code'),
      tier:           fd.get('tier'),
      category:       fd.get('category'),
      contact_name:   fd.get('contact_name'),
      contact_email:  fd.get('contact_email'),
      contact_phone:  fd.get('contact_phone'),
      city:           fd.get('city'),
      country:        fd.get('country') || 'US',
      lead_time_days: Number(fd.get('lead_time_days')),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Add Supplier</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
                <input name="name" required className="input" placeholder="e.g. Atlas Logistics Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Code</label>
                  <input name="code" required className="input" placeholder="e.g. ALC-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tier</label>
                  <select name="tier" className="input">
                    <option value="standard">Standard</option>
                    <option value="preferred">Preferred</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select name="category" className="input">
                  <option value="manufacturer">Manufacturer</option>
                  <option value="carrier">Carrier</option>
                  <option value="distributor">Distributor</option>
                  <option value="3pl">3PL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Name</label>
                <input name="contact_name" required className="input" placeholder="Primary contact" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input name="contact_email" required type="email" className="input" placeholder="contact@supplier.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                  <input name="contact_phone" className="input" type="tel" placeholder="+1-555-000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                  <input name="city" required className="input" placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                  <input name="country" className="input" placeholder="US" defaultValue="US" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Lead Time (days)</label>
                  <input name="lead_time_days" required type="number" min="1" className="input" placeholder="7" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Adding…' : 'Add Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function SuppliersPage() {
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers(),
    staleTime: 0,
  })

  const suppliers: Supplier[] = data?.items ?? []
  const filtered = search.trim()
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase()) ||
          s.contact_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : suppliers

  const avgRating = suppliers.length
    ? (suppliers.reduce((sum, s) => sum + (s.rating_score || 0), 0) / suppliers.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} in your network`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats */}
      {!isLoading && suppliers.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Suppliers', value: suppliers.length, sub: 'in network' },
            { label: 'Premium Tier',    value: suppliers.filter(s => s.tier === 'premium').length, sub: 'top-tier suppliers' },
            { label: 'Avg Rating',      value: avgRating, sub: 'out of 5.0' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="stat-card">
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, code or contact…"
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
              {['Supplier', 'Tier', 'Category', 'Contact', 'Location', 'Lead Time', 'Rating'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
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
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
                    <p className="font-medium text-gray-500">No suppliers found</p>
                    <p className="text-xs mt-1">
                      {search ? 'Try a different search term' : 'Add your first supplier to get started'}
                    </p>
                  </td>
                </tr>
              )
              : filtered.map((s) => {
                const tierCfg = TIER_CONFIG[s.tier] ?? { label: s.tier, cls: 'badge-neutral' }
                return (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-800 text-xs">{s.name}</p>
                      <p className="font-mono text-xs text-cyan-600">{s.code}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge ${tierCfg.cls}`}>{tierCfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium text-gray-700">{s.contact_name}</p>
                      <a href={`mailto:${s.contact_email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-600 mt-0.5">
                        <Mail className="w-3 h-3" />{s.contact_email}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {s.city}, {s.country}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {s.lead_time_days} day{s.lead_time_days !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3.5">
                      <StarRating score={s.rating_score || 0} />
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddSupplierModal
          onClose={() => setShowModal(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['suppliers'] })}
        />
      )}
    </div>
  )
}
