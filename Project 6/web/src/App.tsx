import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ShipmentsPage } from './pages/shipments/ShipmentsPage'
import { WarehousesPage } from './pages/warehouses/WarehousesPage'
import { FleetPage } from './pages/fleet/FleetPage'
import { RoutesPage } from './pages/routes/RoutesPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { SuppliersPage } from './pages/suppliers/SuppliersPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { useAuthStore } from './store/authStore'

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/shipments/*" element={<ShipmentsPage />} />
                  <Route path="/warehouses/*" element={<WarehousesPage />} />
                  <Route path="/fleet/*" element={<FleetPage />} />
                  <Route path="/routes/*" element={<RoutesPage />} />
                  <Route path="/orders/*" element={<OrdersPage />} />
                  <Route path="/suppliers/*" element={<SuppliersPage />} />
                  <Route path="/analytics/*" element={<AnalyticsPage />} />
                  <Route path="/settings/*" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
