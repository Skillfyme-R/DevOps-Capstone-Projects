// NexaFlow Mock API Server
// A zero-dependency Node.js HTTP server that returns realistic mock data
// for all NexaFlow API endpoints so the React UI is fully browsable.

const http = require('http')

const PORT = parseInt(process.env.PORT || '8080', 10)

// ─── In-memory stores (start empty — all data comes from the UI) ──────────────

const mockShipments = []
const mockWarehouses = []
const mockVehicles   = []
const mockOrders     = []
const mockSuppliers  = []
const mockInventory  = []

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-NexaFlow-Org-ID', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise(resolve => {
    let body = ''
    req.on('data', d => body += d)
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
  })
}

// ─── Router ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const { method, url } = req
  const path = url.split('?')[0]

  if (method === 'OPTIONS') { json(res, 204, {}); return }

  // Health
  if (path === '/healthz' || path === '/readyz') {
    json(res, 200, { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0-mock' }); return
  }

  // Auth
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const body = await readBody(req)
    if (body.email && body.password) {
      json(res, 200, { token: 'mock-jwt-token-nexaflow-demo', expires_in: 86400, user_id: 'u1', org_id: 'org1', email: body.email, role: 'admin' })
    } else {
      json(res, 401, { error: 'invalid credentials' })
    }
    return
  }
  if (path === '/api/v1/auth/me') {
    json(res, 200, { user_id: 'u1', org_id: 'org1', email: 'admin@nexaflow.io', role: 'admin' }); return
  }
  if (path === '/api/v1/auth/logout') { json(res, 204, {}); return }

  // Dashboard
  if (path === '/api/v1/dashboard') {
    const activeShipments  = mockShipments.filter(s => !['delivered','cancelled'].includes(s.status)).length
    const pendingOrders    = mockOrders.filter(o => ['draft','confirmed','processing'].includes(o.status)).length
    const availableVehicles = mockVehicles.filter(v => v.status === 'available').length
    const lowStockItems    = mockInventory.filter(i => ['low_stock','out_of_stock'].includes(i.status)).length
    const exceptionShipments = mockShipments.filter(s => s.status === 'exception')
    const alerts = []
    if (lowStockItems > 0) alerts.push({ level: 'warning', message: `${lowStockItems} item${lowStockItems > 1 ? 's' : ''} below reorder point — replenishment recommended`, entity: 'inventory', created_at: new Date().toISOString() })
    exceptionShipments.forEach(s => alerts.push({ level: 'warning', message: `Shipment ${s.tracking_number} — delivery exception detected`, entity: 'shipment', entity_id: s.id, created_at: s.updated_at }))
    json(res, 200, {
      generated_at: new Date().toISOString(),
      active_shipments: activeShipments,
      pending_orders: pendingOrders,
      available_vehicles: availableVehicles,
      warehouse_count: mockWarehouses.length,
      low_stock_items: lowStockItems,
      recent_shipments: mockShipments.slice(0, 5).map(s => ({ id: s.id, tracking_number: s.tracking_number, status: s.status, destination: s.destination_address, updated_at: s.updated_at })),
      recent_alerts: alerts,
    }); return
  }

  // Shipments
  if (path === '/api/v1/shipments' && method === 'GET') {
    json(res, 200, { items: mockShipments, total: mockShipments.length, limit: 20, offset: 0 }); return
  }
  if (path.startsWith('/api/v1/shipments/track/')) {
    const num = path.replace('/api/v1/shipments/track/', '')
    const s = mockShipments.find(s => s.tracking_number === num)
    if (s) { json(res, 200, s) } else { json(res, 404, { error: 'not found' }) }
    return
  }
  if (path.startsWith('/api/v1/shipments/') && method === 'GET') {
    const id = path.replace('/api/v1/shipments/', '')
    const s = mockShipments.find(s => s.id === id)
    if (s) { json(res, 200, s) } else { json(res, 404, { error: 'not found' }) }
    return
  }
  if (path === '/api/v1/shipments' && method === 'POST') {
    const body = await readBody(req)
    const s = { id: 's' + Date.now(), tracking_number: 'NXF-' + Math.random().toString(36).substring(2,10).toUpperCase(), status: 'pending', organization_id: 'org1', ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockShipments.unshift(s)
    json(res, 201, s); return
  }

  // Warehouses
  if (path === '/api/v1/warehouses' && method === 'GET') {
    json(res, 200, { items: mockWarehouses, total: mockWarehouses.length }); return
  }
  if (path === '/api/v1/warehouses' && method === 'POST') {
    const body = await readBody(req)
    const wh = { id: 'wh' + Date.now(), organization_id: 'org1', ...body, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockWarehouses.unshift(wh)
    json(res, 201, wh); return
  }

  // Inventory
  if (path === '/api/v1/inventory/alerts/low-stock') {
    const items = mockInventory.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock')
    json(res, 200, { items, total: items.length }); return
  }

  // Fleet
  if (path === '/api/v1/fleet/vehicles' && method === 'GET') {
    json(res, 200, { items: mockVehicles }); return
  }
  if (path === '/api/v1/fleet/vehicles/available') {
    json(res, 200, { items: mockVehicles.filter(v => v.status === 'available'), total: 1 }); return
  }
  if (path === '/api/v1/fleet/vehicles' && method === 'POST') {
    const body = await readBody(req)
    const v = { id: 'v' + Date.now(), organization_id: 'org1', status: 'available', odometer_km: 0, is_active: true, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockVehicles.unshift(v)
    json(res, 201, v); return
  }

  // Orders
  if (path === '/api/v1/orders' && method === 'GET') {
    json(res, 200, { items: mockOrders, total: mockOrders.length, limit: 20, offset: 0 }); return
  }
  if (path === '/api/v1/orders' && method === 'POST') {
    const body = await readBody(req)
    const qty = body.line_items?.[0]?.quantity || 1
    const unitPrice = body.line_items?.[0]?.unit_price_cents || 0
    const subtotal = qty * unitPrice
    const shipping = 1500
    const tax = Math.round(subtotal * 0.085)
    const o = { id: 'o' + Date.now(), organization_id: 'org1', order_number: 'ORD-2026-' + String(mockOrders.length + 1).padStart(5, '0'), status: 'draft', subtotal_cents: subtotal, shipping_cents: shipping, tax_cents: tax, total_cents: subtotal + shipping + tax, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockOrders.unshift(o)
    json(res, 201, o); return
  }
  if (path.match(/^\/api\/v1\/orders\/([^/]+)\/confirm$/) && method === 'POST') {
    const id = path.match(/^\/api\/v1\/orders\/([^/]+)\/confirm$/)[1]
    const o = mockOrders.find(o => o.id === id)
    if (!o) { json(res, 404, { error: 'order not found' }); return }
    if (['delivered', 'cancelled'].includes(o.status)) { json(res, 400, { error: `cannot confirm order in status: ${o.status}` }); return }
    o.status = 'confirmed'
    o.updated_at = new Date().toISOString()
    json(res, 200, o); return
  }
  if (path.match(/^\/api\/v1\/orders\/([^/]+)\/cancel$/) && method === 'POST') {
    const id = path.match(/^\/api\/v1\/orders\/([^/]+)\/cancel$/)[1]
    const o = mockOrders.find(o => o.id === id)
    if (!o) { json(res, 404, { error: 'order not found' }); return }
    if (['delivered', 'cancelled'].includes(o.status)) { json(res, 400, { error: `cannot cancel order in status: ${o.status}` }); return }
    o.status = 'cancelled'
    o.updated_at = new Date().toISOString()
    json(res, 200, o); return
  }
  if (path.startsWith('/api/v1/orders/') && method === 'GET') {
    const id = path.replace('/api/v1/orders/', '')
    const o = mockOrders.find(o => o.id === id)
    if (o) { json(res, 200, o) } else { json(res, 404, { error: 'not found' }) }
    return
  }

  // Suppliers
  if (path === '/api/v1/suppliers' && method === 'GET') {
    json(res, 200, { items: mockSuppliers, total: mockSuppliers.length }); return
  }
  if (path === '/api/v1/suppliers' && method === 'POST') {
    const body = await readBody(req)
    const sup = { id: 'sup' + Date.now(), organization_id: 'org1', is_active: true, rating_score: 0, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockSuppliers.unshift(sup)
    json(res, 201, sup); return
  }

  // Analytics
  if (path === '/api/v1/analytics/kpi') {
    const delivered       = mockShipments.filter(s => s.status === 'delivered').length
    const total           = mockShipments.length
    const onTimeRate      = total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 0
    const activeVehicles  = mockVehicles.filter(v => v.status === 'on_route').length
    const fleetUtil       = mockVehicles.length > 0 ? parseFloat(((activeVehicles / mockVehicles.length) * 100).toFixed(1)) : 0
    const totalRevenue    = mockOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_cents || 0), 0)
    const fulfilledOrders = mockOrders.filter(o => o.status === 'delivered').length
    const orderRate       = mockOrders.length > 0 ? parseFloat(((fulfilledOrders / mockOrders.length) * 100).toFixed(1)) : 0
    json(res, 200, {
      period_start: new Date(Date.now() - 86400000 * 30).toISOString(),
      period_end: new Date().toISOString(),
      total_shipments: total,
      delivered_on_time: delivered,
      on_time_delivery_rate: onTimeRate,
      avg_transit_hours: 0,
      total_orders: mockOrders.length,
      order_fulfillment_rate: orderRate,
      active_vehicles: activeVehicles,
      fleet_utilization_rate: fleetUtil,
      warehouse_count: mockWarehouses.length,
      low_stock_alerts: mockInventory.filter(i => ['low_stock','out_of_stock'].includes(i.status)).length,
      total_revenue_cents: totalRevenue,
    }); return
  }
  if (path === '/api/v1/analytics/shipments-by-status') {
    const statuses = ['pending','picked_up','in_transit','out_for_delivery','delivered','exception','cancelled']
    const data = statuses.map(s => ({ status: s, count: mockShipments.filter(x => x.status === s).length })).filter(d => d.count > 0)
    json(res, 200, { data }); return
  }
  if (path === '/api/v1/analytics/top-routes') {
    const routeMap = {}
    mockShipments.forEach(s => {
      const key = `${s.origin_warehouse_id || 'Unknown'} → ${s.destination_address || 'Unknown'}`
      routeMap[key] = (routeMap[key] || 0) + 1
    })
    const data = Object.entries(routeMap).slice(0, 5).map(([route, count]) => {
      const [origin, destination] = route.split(' → ')
      return { origin, destination, shipment_count: count, avg_transit_hours: 0 }
    })
    json(res, 200, { data }); return
  }
  if (path === '/api/v1/analytics/fleet-utilization') {
    const onRoute = mockVehicles.filter(v => v.status === 'on_route').length
    const util    = mockVehicles.length > 0 ? parseFloat(((onRoute / mockVehicles.length) * 100).toFixed(1)) : 0
    json(res, 200, { total_vehicles: mockVehicles.length, on_route: onRoute, utilization_percent: util }); return
  }
  if (path === '/api/v1/analytics/revenue-trend') {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - 86400000 * i)
      const dayOrders = mockOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString())
      data.push({ day: d.toISOString(), revenue_cents: dayOrders.reduce((s, o) => s + (o.total_cents || 0), 0), order_count: dayOrders.length })
    }
    json(res, 200, { data }); return
  }

  // Workflows
  if (path === '/api/v1/workflows') {
    json(res, 200, { items: [ { id: 'wf1', name: 'Express Shipment Workflow', trigger_type: 'event', trigger_on: 'order.confirmed', steps: [{ order: 1, name: 'Warehouse Pickup', type: 'pickup' }, { order: 2, name: 'Quality Inspection', type: 'inspection' }, { order: 3, name: 'Loading & Dispatch', type: 'loading' }], is_active: true, created_at: '2024-01-01T00:00:00Z' } ] }); return
  }
  if (path === '/api/v1/workflow-executions') {
    json(res, 200, { items: [] }); return
  }

  // Route optimisation
  if (path === '/api/v1/routes/optimize' && method === 'POST') {
    const body = await readBody(req)
    const stops = body.stops || []
    json(res, 200, { route_id: 'rt-' + Date.now(), vehicle_id: body.vehicle_id, mode: body.mode || 'fastest', optimised_stops: stops, total_distance_km: 142.5, estimated_hours: 2.4, fuel_estimate_liters: 17.1, co2_estimate_kg: 45.1, created_at: new Date().toISOString() }); return
  }

  // Metrics (empty — Prometheus scrapes the real server)
  if (path === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('# NexaFlow mock metrics\nnexaflow_mock_server_up 1\n'); return
  }

  json(res, 404, { error: 'endpoint not found', path })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NexaFlow Mock API running on http://0.0.0.0:${PORT}`)
  console.log('   Endpoints: /healthz, /api/v1/auth/login, /api/v1/dashboard,')
  console.log('              /api/v1/shipments, /api/v1/warehouses, /api/v1/fleet/vehicles,')
  console.log('              /api/v1/orders, /api/v1/suppliers, /api/v1/analytics/*\n')
})
