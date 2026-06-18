import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { AppLayout }      from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const LandingPage      = lazy(() => import('./pages/LandingPage'));
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
        {/* Landing page — shown at "/" for non-logged-in users */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"    element={<DashboardPage />} />
            <Route path="/accounts"     element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/loans"        element={<LoansPage />} />
            <Route path="/loans/apply"  element={<LoanApplyPage />} />
            <Route path="/loans/:id"    element={<LoanDetailPage />} />
            <Route path="/payments"     element={<PaymentsPage />} />
            <Route path="/analytics"    element={<AnalyticsPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
