import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { AppLayout }      from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Lazy-load all pages for code splitting (faster initial load)
const LandingPage         = lazy(() => import('./pages/LandingPage'));
const LoginPage           = lazy(() => import('./pages/LoginPage'));
const RegisterPage        = lazy(() => import('./pages/RegisterPage'));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const CatalogPage         = lazy(() => import('./pages/CatalogPage'));
const ProductDetailPage   = lazy(() => import('./pages/ProductDetailPage'));
const CartPage            = lazy(() => import('./pages/CartPage'));
const CheckoutPage        = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage          = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage     = lazy(() => import('./pages/OrderDetailPage'));
const VendorsPage         = lazy(() => import('./pages/VendorsPage'));
const VendorStorePage     = lazy(() => import('./pages/VendorStorePage'));
const VendorDashboardPage = lazy(() => import('./pages/VendorDashboardPage'));
const AnalyticsPage       = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const WishlistPage        = lazy(() => import('./pages/WishlistPage'));
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={44} sx={{ color: 'primary.main' }} />
    </Box>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public pages — no layout */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All app pages — always rendered inside AppLayout */}
        <Route element={<AppLayout />}>
          {/* Browseable without login */}
          <Route path="/catalog"      element={<CatalogPage />} />
          <Route path="/catalog/:id"  element={<ProductDetailPage />} />
          <Route path="/vendors"      element={<VendorsPage />} />
          <Route path="/vendors/:id"  element={<VendorStorePage />} />

          {/* Require login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"           element={<DashboardPage />} />
            <Route path="/cart"                element={<CartPage />} />
            <Route path="/checkout"            element={<CheckoutPage />} />
            <Route path="/orders"              element={<OrdersPage />} />
            <Route path="/orders/:id"          element={<OrderDetailPage />} />
            <Route path="/vendor/dashboard"    element={<VendorDashboardPage />} />
            <Route path="/analytics"           element={<AnalyticsPage />} />
            <Route path="/wishlist"            element={<WishlistPage />} />
            <Route path="/profile"             element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
