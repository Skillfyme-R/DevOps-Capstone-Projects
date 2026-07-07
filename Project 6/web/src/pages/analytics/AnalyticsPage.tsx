import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import {
  fetchKPI, fetchShipmentsByStatus, fetchTopRoutes,
  fetchFleetUtilization, fetchRevenueTrend,
} from '../../services/api'
import { format } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  delivered:        '#10b981',
  in_transit:       '#00d4ff',
  pending:          '#9ca3af',
  out_for_delivery: '#f59e0b',
  exception:        '#ef4444',
  cancelled:        '#6b7280',
  picked_up:        '#6366f1',
}

const PIE_COLORS = ['#0d1b2a', '#00d4ff', '#ff6b35', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

function KpiPill({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="card flex flex-col gap-1 text-center">
      <p className="text-3xl font-bold text-navy-900">
        {value}
        {unit && <span className="text-base font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

export function AnalyticsPage() {
  const { data: kpi } = useQuery({ queryKey: ['kpi'], queryFn: fetchKPI })
  const { data: byStatus } = useQuery({ queryKey: ['shipments-by-status'], queryFn: fetchShipmentsByStatus })
  const { data: topRoutes } = useQuery({ queryKey: ['top-routes'], queryFn: fetchTopRoutes })
  const { data: fleet } = useQuery({ queryKey: ['fleet-utilization'], queryFn: fetchFleetUtilization })
  const { data: revenue } = useQuery({ queryKey: ['revenue-trend'], queryFn: fetchRevenueTrend })

  const statusData = byStatus?.data ?? []
  const routeData = topRoutes?.data ?? []
  const revenueData = (revenue?.data ?? []).map((d: any) => ({
    ...d,
    day: format(new Date(d.day), 'MMM d'),
    revenue: d.revenue_cents / 100,
  }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform performance over the last 30 days</p>
        </div>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiPill
          label="Total Shipments"
          value={(kpi?.total_shipments ?? 0).toLocaleString()}
        />
        <KpiPill
          label="On-Time Delivery"
          value={(kpi?.on_time_delivery_rate ?? 0).toFixed(1)}
          unit="%"
        />
        <KpiPill
          label="Avg Transit Time"
          value={(kpi?.avg_transit_hours ?? 0).toFixed(1)}
          unit="hrs"
        />
        <KpiPill
          label="Revenue"
          value={`$${((kpi?.total_revenue_cents ?? 0) / 100).toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Shipments by status — pie */}
        <div className="card">
          <h3 className="mb-4">Shipments by Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ status, percent }) =>
                  `${status?.replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {statusData.map((entry: any, i: number) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: string) => [v, n.replace(/_/g, ' ')]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet utilization */}
        <div className="card">
          <h3 className="mb-4">Fleet Utilization</h3>
          {fleet && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Vehicles on route</span>
                <span className="font-semibold">{fleet.on_route} / {fleet.total_vehicles}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-navy-700 rounded-full transition-all duration-700"
                  style={{ width: `${fleet.utilization_percent ?? 0}%` }}
                />
              </div>
              <p className="text-4xl font-bold text-navy-900 text-center">
                {(fleet.utilization_percent ?? 0).toFixed(1)}%
                <span className="text-base font-normal text-gray-400 ml-2">utilization</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue trend */}
      {revenueData.length > 0 && (
        <div className="card">
          <h3 className="mb-4">Revenue Trend (30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top routes */}
      {routeData.length > 0 && (
        <div className="card">
          <h3 className="mb-4">Top Routes by Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={routeData.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="destination"
                tick={{ fontSize: 10 }}
                width={120}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="shipment_count" fill="#0d1b2a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
