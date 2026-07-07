import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Search, X, ChevronRight,
  Package, CheckCircle, XCircle, Clock, Truck,
  BadgeCheck, AlertCircle, RotateCcw, DollarSign,
  User, MapPin, Calendar, Hash, Tag,
} from 'lucide-react'
import { fetchOrders, confirmOrder, cancelOrder, createOrder } from '../../services/api'
import { format } from 'date-fns'

// ─── New Order Modal ──────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: unknown) => createOrder(payload),
    onSuccess: () => { onCreated(); onClose() },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      customer_name:    fd.get('customer_name'),
      customer_email:   fd.get('customer_email'),
      shipping_address: fd.get('shipping_address'),
      priority:         fd.get('priority'),
      currency:         'USD',
      line_items: [{
        sku:               fd.get('sku'),
        name:              fd.get('item_name'),
        quantity:          Number(fd.get('quantity')),
        unit_price_cents:  Math.round(Number(fd.get('unit_price')) * 100),
        total_price_cents: Math.round(Number(fd.get('unit_price')) * 100 * Number(fd.get('quantity'))),
        weight_kg:         Number(fd.get('weight_kg')),
      }],
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">New Order</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer Name</label>
                <input name="customer_name" required className="input" placeholder="e.g. Acme Corporation" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer Email</label>
                <input name="customer_email" required type="email" className="input" placeholder="orders@acme.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Shipping Address</label>
                <input name="shipping_address" required className="input" placeholder="Full delivery address" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
                <select name="priority" className="input">
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="economy">Economy</option>
                </select>
              </div>

              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Line Item</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">SKU</label>
                  <input name="sku" required className="input" placeholder="e.g. SKU-X100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Item Name</label>
                  <input name="item_name" required className="input" placeholder="Product name" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity</label>
                  <input name="quantity" required type="number" min="1" className="input" placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Unit Price ($)</label>
                  <input name="unit_price" required type="number" step="0.01" className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Weight (kg)</label>
                  <input name="weight_kg" required type="number" step="0.1" className="input" placeholder="0.0" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Creating…' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  sku: string
  name: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
  weight_kg: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  status: string
  priority: string
  shipping_address: string
  line_items: LineItem[]
  subtotal_cents: number
  shipping_cents: number
  tax_cents: number
  total_cents: number
  currency: string
  shipment_id?: string
  created_at: string
  updated_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: '', label: 'All Orders' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  express:  { label: 'Express',  cls: 'badge-error' },
  standard: { label: 'Standard', cls: 'badge-neutral' },
  economy:  { label: 'Economy',  cls: 'badge-info' },
}

type StatusIconProps = { className?: string }

const STATUS_CONFIG: Record<string, { label: string; cls: string; Icon: React.FC<StatusIconProps> }> = {
  draft:      { label: 'Draft',      cls: 'badge-neutral', Icon: (p) => <Clock      {...p} /> },
  confirmed:  { label: 'Confirmed',  cls: 'badge-info',    Icon: (p) => <BadgeCheck {...p} /> },
  processing: { label: 'Processing', cls: 'badge-warning', Icon: (p) => <RotateCcw  {...p} /> },
  shipped:    { label: 'Shipped',    cls: 'badge-info',    Icon: (p) => <Truck      {...p} /> },
  delivered:  { label: 'Delivered',  cls: 'badge-success', Icon: (p) => <CheckCircle {...p} /> },
  cancelled:  { label: 'Cancelled',  cls: 'badge-error',   Icon: (p) => <XCircle    {...p} /> },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'badge-neutral', Icon: (p: StatusIconProps) => <AlertCircle {...p} /> }
  const { Icon } = cfg
  return (
    <span className={`badge gap-1 ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, cls: 'badge-neutral' }
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

function OrderDetailPanel({
  order,
  onClose,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  order: Order
  onClose: () => void
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  isConfirming: boolean
  isCancelling: boolean
}) {
  const canConfirm = order.status === 'draft'
  const canCancel  = !['delivered', 'cancelled'].includes(order.status)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-sm z-30"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Order Detail</p>
            <h2 className="font-mono text-cyan-700 font-semibold">{order.order_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-6">

          {/* Badges row */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
            {order.shipment_id && (
              <span className="badge badge-info gap-1">
                <Truck className="w-3 h-3" /> Linked Shipment
              </span>
            )}
          </div>

          {/* Customer info */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</p>
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{order.customer_name}</p>
                <p className="text-xs text-gray-500">{order.customer_email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{order.shipping_address}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex gap-6 text-xs text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {format(new Date(order.updated_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Line Items ({order.line_items?.length ?? 0})
            </p>
            <div className="space-y-2">
              {(order.line_items ?? []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3 bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Hash className="w-3 h-3" />
                        {item.sku}
                      </span>
                      <span className="text-xs text-gray-400">{item.weight_kg} kg ea</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmtCents(item.total_price_cents, order.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.quantity} × {fmtCents(item.unit_price_cents, order.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals breakdown */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50 text-sm">
              {[
                { label: 'Subtotal', value: order.subtotal_cents },
                { label: 'Shipping', value: order.shipping_cents },
                { label: 'Tax',      value: order.tax_cents      },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-4 py-2.5 text-gray-600">
                  <span>{label}</span>
                  <span>{fmtCents(value, order.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 bg-gray-50 font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-cyan-700">{fmtCents(order.total_cents, order.currency)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action footer */}
        {(canConfirm || canCancel) && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
            {canConfirm && (
              <button
                onClick={() => onConfirm(order.id)}
                disabled={isConfirming}
                className="btn-primary flex-1 justify-center"
              >
                <CheckCircle className="w-4 h-4" />
                {isConfirming ? 'Confirming…' : 'Confirm Order'}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel(order.id)}
                disabled={isCancelling}
                className="btn-danger flex-1 justify-center"
              >
                <XCircle className="w-4 h-4" />
                {isCancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

// ─── Summary stat cards ───────────────────────────────────────────────────────

function SummaryCards({ orders }: { orders: Order[] }) {
  const totalRev  = orders.reduce((s, o) => s + o.total_cents, 0)
  const pending   = orders.filter((o) => ['draft', 'confirmed', 'processing'].includes(o.status)).length
  const delivered = orders.filter((o) => o.status === 'delivered').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        {
          label: 'Total Orders', value: orders.length, sub: 'all statuses',
          Icon: ShoppingCart, color: 'text-navy-900', bg: 'bg-slate-100',
        },
        {
          label: 'Revenue', value: fmtCents(totalRev), sub: 'across all orders',
          Icon: DollarSign, color: 'text-cyan-700', bg: 'bg-cyan-50',
        },
        {
          label: 'In Progress', value: pending, sub: 'awaiting fulfilment',
          Icon: Package, color: 'text-amber-600', bg: 'bg-amber-50',
        },
        {
          label: 'Delivered', value: delivered, sub: 'completed orders',
          Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50',
        },
      ].map(({ label, value, sub, Icon, color, bg }) => (
        <div key={label} className="stat-card">
          <div className={`self-start p-2.5 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      ))}
    </div>
  )
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat-card animate-pulse space-y-2">
          <div className="w-10 h-10 rounded-lg bg-gray-100" />
          <div className="h-7 w-16 bg-gray-100 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Main page component ──────────────────────────────────────────────────────

export function OrdersPage() {
  const [activeStatus, setActiveStatus]   = useState('')
  const [search, setSearch]               = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showNewOrder, setShowNewOrder]   = useState(false)
  const [page, setPage]                   = useState(0)
  const limit = 20

  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeStatus, page],
    queryFn: () => fetchOrders({ status: activeStatus, limit, offset: page * limit }),
    staleTime: 30_000,
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
    },
  })

  const allOrders: Order[] = data?.items ?? []
  const total: number      = data?.total ?? 0

  const filtered = search.trim()
    ? allOrders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search.toLowerCase()) ||
          o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer_email.toLowerCase().includes(search.toLowerCase()),
      )
    : allOrders

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} order${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewOrder(true)}>
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Summary cards */}
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards orders={allOrders} />}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Search box */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status tab pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveStatus(tab.value); setPage(0) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeStatus === tab.value
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left">
              {['Order #', 'Customer', 'Status', 'Priority', 'Items', 'Total', 'Created', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)

              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-25" />
                    <p className="font-medium text-gray-500">No orders found</p>
                    <p className="text-xs mt-1">
                      {search
                        ? 'Try a different search term or clear the filter'
                        : 'Create your first order to get started'}
                    </p>
                  </td>
                </tr>
              )

              : filtered.map((order) => (
                <tr
                  key={order.id}
                  className="table-row-hover"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold text-cyan-700">
                      {order.order_number}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-gray-800">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{order.customer_email}</p>
                  </td>

                  <td className="px-4 py-3.5">
                    <StatusBadge status={order.status} />
                  </td>

                  <td className="px-4 py-3.5">
                    <PriorityBadge priority={order.priority} />
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Tag className="w-3.5 h-3.5" />
                      {order.line_items?.length ?? 0}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs font-semibold text-gray-900">
                    {fmtCents(order.total_cents, order.currency)}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </td>

                  <td className="px-4 py-3.5">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {/* Pagination footer */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New order modal */}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['orders'] })}
        />
      )}

      {/* Order detail slide-over */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={(id) => confirmMutation.mutate(id)}
          onCancel={(id) => cancelMutation.mutate(id)}
          isConfirming={confirmMutation.isPending}
          isCancelling={cancelMutation.isPending}
        />
      )}
    </div>
  )
}
