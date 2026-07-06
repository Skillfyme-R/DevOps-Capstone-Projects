import React, { Suspense, lazy, Component, ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import apolloClient from './graph/client'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/auth/PrivateRoute'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/layout/LoadingScreen'
import { NotificationProvider } from './contexts/NotificationContext'

// Lazy-load route-level pages for code splitting
const LoginPage = lazy(() => import('./components/auth/LoginPage'))
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'))
const CatalogPage = lazy(() => import('./components/catalog/CatalogPage'))
const ContentDetailPage = lazy(() => import('./components/catalog/ContentDetailPage'))
const PlayerPage = lazy(() => import('./components/player/PlayerPage'))
const StudioDashboard = lazy(() => import('./components/studio/StudioDashboard'))
const StudioContentList = lazy(() => import('./components/studio/StudioContentList'))
const StudioUpload = lazy(() => import('./components/studio/StudioUpload'))
const BillingPage = lazy(() => import('./components/billing/BillingPage'))
const AccountPage = lazy(() => import('./components/account/AccountPage'))
const SupportPage = lazy(() => import('./components/support/SupportPage'))
const CDNDashboard = lazy(() => import('./components/dashboard/CDNDashboard'))
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const SearchPage = lazy(() => import('./components/catalog/SearchPage'))
const WatchlistPage = lazy(() => import('./components/catalog/WatchlistPage'))
const AdminTicketsPage = lazy(() => import('./components/admin/AdminTicketsPage'))

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { error: error?.message ?? String(error) }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: '#fff', padding: '2rem', background: '#0A0E1A', minHeight: '100vh' }}>
          <h2 style={{ color: '#EF4444' }}>Page Error</h2>
          <pre style={{ color: '#94A3B8', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
          <button
            onClick={() => { this.setState({ error: null }); window.history.back() }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#7C3AED', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
          >← Go Back</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
          <ErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/invite/:token" element={<RegisterPage />} />

              {/* Protected routes inside AppLayout */}
              <Route element={<PrivateRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/catalog" replace />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/catalog/search" element={<SearchPage />} />
                  <Route path="/catalog/:slug" element={<ContentDetailPage />} />
                  <Route path="/watchlist" element={<WatchlistPage />} />
                  <Route path="/watch/:contentId" element={<PlayerPage />} />
                  <Route path="/watch/:contentId/episode/:episodeId" element={<PlayerPage />} />
                  <Route path="/studio" element={<StudioDashboard />} />
                  <Route path="/studio/:studioId/content" element={<StudioContentList />} />
                  <Route path="/studio/:studioId/upload" element={<StudioUpload />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/support/:issueId" element={<SupportPage />} />
                  <Route path="/cdn" element={<CDNDashboard />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin/tickets" element={<AdminTicketsPage />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/catalog" replace />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  )
}
