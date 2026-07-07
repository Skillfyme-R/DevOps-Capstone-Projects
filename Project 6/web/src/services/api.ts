import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { token, orgId } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (orgId) config.headers['X-NexaFlow-Org-ID'] = orgId
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// --- Auth ---
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)

// --- Dashboard ---
export const fetchDashboard = () =>
  api.get('/dashboard').then((r) => r.data)

// --- Shipments ---
export const fetchShipments = (params?: Record<string, string | number>) =>
  api.get('/shipments', { params }).then((r) => r.data)

export const fetchShipment = (id: string) =>
  api.get(`/shipments/${id}`).then((r) => r.data)

export const trackShipment = (trackingNumber: string) =>
  api.get(`/shipments/track/${trackingNumber}`).then((r) => r.data)

export const createShipment = (payload: unknown) =>
  api.post('/shipments', payload).then((r) => r.data)

export const updateShipmentStatus = (id: string, payload: unknown) =>
  api.patch(`/shipments/${id}`, payload).then((r) => r.data)

// --- Warehouses ---
export const fetchWarehouses = (params?: Record<string, string | boolean>) =>
  api.get('/warehouses', { params }).then((r) => r.data)

export const fetchWarehouse = (id: string) =>
  api.get(`/warehouses/${id}`).then((r) => r.data)

export const createWarehouse = (payload: unknown) =>
  api.post('/warehouses', payload).then((r) => r.data)

// --- Inventory ---
export const fetchLowStockAlerts = () =>
  api.get('/inventory/alerts/low-stock').then((r) => r.data)

export const adjustInventory = (id: string, payload: unknown) =>
  api.post(`/inventory/${id}/adjust`, payload).then((r) => r.data)

// --- Fleet ---
export const fetchVehicles = () =>
  api.get('/fleet/vehicles').then((r) => r.data)

export const fetchAvailableVehicles = () =>
  api.get('/fleet/vehicles/available').then((r) => r.data)

export const fetchVehicle = (id: string) =>
  api.get(`/fleet/vehicles/${id}`).then((r) => r.data)

export const createVehicle = (payload: unknown) =>
  api.post('/fleet/vehicles', payload).then((r) => r.data)

export const updateVehicleLocation = (id: string, payload: unknown) =>
  api.patch(`/fleet/vehicles/${id}/location`, payload).then((r) => r.data)

// --- Routes ---
export const optimizeRoute = (payload: unknown) =>
  api.post('/routes/optimize', payload).then((r) => r.data)

// --- Orders ---
export const fetchOrders = (params?: Record<string, string | number>) =>
  api.get('/orders', { params }).then((r) => r.data)

export const fetchOrder = (id: string) =>
  api.get(`/orders/${id}`).then((r) => r.data)

export const createOrder = (payload: unknown) =>
  api.post('/orders', payload).then((r) => r.data)

export const confirmOrder = (id: string) =>
  api.post(`/orders/${id}/confirm`).then((r) => r.data)

export const cancelOrder = (id: string) =>
  api.post(`/orders/${id}/cancel`).then((r) => r.data)

// --- Suppliers ---
export const fetchSuppliers = (params?: Record<string, string>) =>
  api.get('/suppliers', { params }).then((r) => r.data)

export const fetchSupplier = (id: string) =>
  api.get(`/suppliers/${id}`).then((r) => r.data)

export const createSupplier = (payload: unknown) =>
  api.post('/suppliers', payload).then((r) => r.data)

// --- Analytics ---
export const fetchKPI = () =>
  api.get('/analytics/kpi').then((r) => r.data)

export const fetchShipmentsByStatus = () =>
  api.get('/analytics/shipments-by-status').then((r) => r.data)

export const fetchTopRoutes = () =>
  api.get('/analytics/top-routes').then((r) => r.data)

export const fetchFleetUtilization = () =>
  api.get('/analytics/fleet-utilization').then((r) => r.data)

export const fetchRevenueTrend = () =>
  api.get('/analytics/revenue-trend').then((r) => r.data)

// --- Workflows ---
export const fetchWorkflows = () =>
  api.get('/workflows').then((r) => r.data)

export const fetchWorkflowExecutions = () =>
  api.get('/workflow-executions').then((r) => r.data)

export const triggerWorkflow = (id: string, ctx: unknown) =>
  api.post(`/workflows/${id}/execute`, ctx).then((r) => r.data)

export default api
