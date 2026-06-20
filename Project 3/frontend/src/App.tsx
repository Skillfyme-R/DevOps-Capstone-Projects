import React, { lazy, Suspense, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth, AuthUser } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const ClinicalPage = lazy(() => import('./pages/ClinicalPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

interface AuthContextValue { user: AuthUser | null; loading: boolean; initialized: boolean; logout: () => Promise<void>; login: (email: string, password: string) => Promise<unknown>; }
export const AuthContext = createContext<AuthContextValue>({ user: null, loading: false, initialized: false, logout: async () => {}, login: async () => {} });
export const useAuthContext = () => useContext(AuthContext);

function Loader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={48} thickness={3} sx={{ color: 'primary.main' }} />
    </Box>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AuthUser['role'][] }) {
  const { user, loading, initialized } = useAuthContext();
  if (!initialized || loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const auth = useAuth();

  if (!auth.initialized) return <Loader />;

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={auth.user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/login" element={auth.user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/register" element={auth.user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute roles={['clinician', 'nurse', 'admin', 'superadmin']}><PatientsPage /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute roles={['clinician', 'nurse', 'admin', 'superadmin']}><PatientDetailPage /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
              <Route path="/clinical" element={<ProtectedRoute roles={['clinician', 'nurse', 'admin', 'superadmin']}><ClinicalPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute roles={['admin', 'superadmin', 'clinician']}><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute roles={['admin', 'superadmin']}><AdminPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
