/**
 * NexusFinance App — Root Component & Route Definitions
 *
 * React Router v6 pattern:
 *   - Public routes:    Accessible without login (/login, /register)
 *   - Protected routes: Require authentication (everything else)
 *   - The <ProtectedRoute> wrapper redirects to /login if not authenticated
 *
 * Route Structure:
 *   /                         → Redirects to /dashboard
 *   /login                    → Login page
 *   /register                 → Registration page
 *   /dashboard                → Financial overview
 *   /accounts                 → List all accounts
 *   /accounts/:id             → Single account detail + transactions
 *   /transactions             → All transactions with filters
 *   /loans                    → Loans overview
 *   /loans/apply              → Loan application form
 *   /loans/:id                → Loan detail + repayment schedule
 *   /payments                 → Send money
 *   /analytics                → Financial charts & insights
 *   /profile                  → User profile & settings
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { AppLayout }      from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Lazy loading: each page is loaded only when the user navigates to it.
// This makes the initial page load much faster.
// Instead of downloading 500KB of code upfront, you download 50KB, then
// load each section on demand.
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const RegisterPage     = lazy(() => import('./pages/RegisterPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const AccountsPage     = lazy(() => import('./pages/AccountsPage'));
const AccountDetailPage= lazy(() => import('./pages/AccountDetailPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const LoansPage        = lazy(() => import('./pages/LoansPage'));
const LoanApplyPage    = lazy(() => import('./pages/LoanApplyPage'));
const LoanDetailPage   = lazy(() => import('./pages/LoanDetailPage'));
const PaymentsPage     = lazy(() => import('./pages/PaymentsPage'));
const AnalyticsPage    = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));

// Loading spinner shown while lazy-loaded pages are being fetched
function PageLoader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={40} />
    </Box>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public Routes (no login needed) ─────────────────────────── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected Routes (must be logged in) ────────────────────── */}
        <Route element={<ProtectedRoute />}>
          {/* AppLayout wraps all protected pages with the sidebar + header */}
          <Route element={<AppLayout />}>
            <Route index            element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"               element={<DashboardPage />} />
            <Route path="/accounts"                element={<AccountsPage />} />
            <Route path="/accounts/:id"            element={<AccountDetailPage />} />
            <Route path="/transactions"            element={<TransactionsPage />} />
            <Route path="/loans"                   element={<LoansPage />} />
            <Route path="/loans/apply"             element={<LoanApplyPage />} />
            <Route path="/loans/:id"               element={<LoanDetailPage />} />
            <Route path="/payments"                element={<PaymentsPage />} />
            <Route path="/analytics"               element={<AnalyticsPage />} />
            <Route path="/profile"                 element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ── 404 ─────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
