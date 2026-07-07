import { useQuery } from '@tanstack/react-query'
import {
  Package, Warehouse, Truck, ShoppingCart, AlertTriangle,
  TrendingUp, CheckCircle, Clock, Activity,
} from 'lucide-react'
import { fetchDashboard, fetchKPI } from '../../services/api'
import { formatDistanceToNow } from 'date-fns'

function StatCard({
  label, value, icon: Icon, color = 'navy', sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: 'navy' | 'cyan' | 'orange' | 'green' | 'red'
  sub?: string
}) {
  const iconBg: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-navy-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_transit: 'badge-info',
    delivered: 'badge-success',
    pending: 'badge-neutral',
    exception: 'badge-error',
    out_for_delivery: 'badge-warning',
    picked_up: 'badge-info',
    cancelled: 'badge-neutral',
  }
  return (
    <span className={`badge ${map[status] ?? 'badge-neutral'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function DashboardPage() {
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  })

  const { data: kpi } = useQuery({
    queryKey: ['kpi'],
    queryFn: fetchKPI,
  })

  if (ovLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time visibility across your logistics network
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Live
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Active Shipments"
          value={overview?.active_shipments ?? 0}
          icon={Package}
          color="cyan"
        />
        <StatCard
          label="Pending Orders"
          value={overview?.pending_orders ?? 0}
          icon={ShoppingCart}
          color="orange"
        />
        <StatCard
          label="Available Vehicles"
          value={overview?.available_vehicles ?? 0}
          icon={Truck}
          color="green"
        />
        <StatCard
          label="Warehouses"
          value={overview?.warehouse_count ?? 0}
          icon={Warehouse}
          color="navy"
        />
        <StatCard
          label="Low Stock Alerts"
          value={overview?.low_stock_items ?? 0}
          icon={AlertTriangle}
          color={overview?.low_stock_items > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Performance metrics */}
      {kpi && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-medium text-gray-600">On-Time Delivery</p>
            </div>
            <p className="text-3xl font-bold text-navy-900">
              {kpi.on_time_delivery_rate?.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-500" />
              <p className="text-sm font-medium text-gray-600">Avg Transit Time</p>
            </div>
            <p className="text-3xl font-bold text-navy-900">
              {kpi.avg_transit_hours?.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-400 mt-1">Per shipment</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-medium text-gray-600">Revenue (30d)</p>
            </div>
            <p className="text-3xl font-bold text-navy-900">
              ${((kpi.total_revenue_cents ?? 0) / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Delivered orders</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Recent shipments */}
        <div className="col-span-3 card">
          <h3 className="mb-4">Recent Shipments</h3>
          {overview?.recent_shipments?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Tracking</th>
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overview.recent_shipments.map((s: any) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="py-2.5 font-mono text-xs text-cyan-600">{s.tracking_number}</td>
                    <td className="py-2.5 text-gray-700 truncate max-w-[140px]">{s.destination}</td>
                    <td className="py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No recent shipments</p>
          )}
        </div>

        {/* Alerts */}
        <div className="col-span-2 card">
          <h3 className="mb-4">Active Alerts</h3>
          {overview?.recent_alerts?.length > 0 ? (
            <div className="space-y-3">
              {overview.recent_alerts.map((a: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    a.level === 'critical'
                      ? 'bg-red-50 text-red-700'
                      : a.level === 'warning'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-cyan-50 text-cyan-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium capitalize">{a.level}</p>
                    <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm text-gray-400">All systems operational</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
