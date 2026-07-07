import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Forecasts } from './pages/Forecasts';
import { theme } from './styles/theme';
import { getStoredKey, clearStoredKey } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, cacheTime: 300_000, retry: false },
  },
});

const SIDEBAR_WIDTH = 260;

interface PlaceholderProps { title: string; subtitle: string; icon: React.ReactNode; }
function Placeholder({ title, subtitle, icon }: PlaceholderProps) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: theme.colors.navy, letterSpacing: '-0.5px' }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: theme.colors.gray400 }}>{subtitle}</p>
      </div>
      <div style={{
        background: theme.colors.white,
        borderRadius: 20,
        padding: '60px 40px',
        border: `1px solid ${theme.colors.gray100}`,
        boxShadow: theme.shadow.sm,
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: theme.colors.gray200 }}>
          {icon}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.navy, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: theme.colors.gray400, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
          This module is active. POST data via the API to view live analytics here.
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 20, padding: '8px 18px', borderRadius: 20,
          background: `${theme.colors.teal}12`, color: theme.colors.tealDark,
          fontSize: 12, fontWeight: 700,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.colors.teal, display: 'inline-block' }} />
          Module Active
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.colors.platinum, fontFamily: theme.font.sans }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, minHeight: '100vh', padding: '32px 36px', maxWidth: 1400 }}>
        <StatusBar />
        <Routes>
          <Route path="/"             element={<Overview />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/expenses"     element={<Placeholder title="Expense Intelligence" subtitle="AI-powered expense categorization and vendor analytics" icon={<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>} />} />
          <Route path="/budgets"      element={<Budgets />} />
          <Route path="/forecasts"    element={<Forecasts />} />
          <Route path="/portfolio"    element={<Placeholder title="Portfolio Insights" subtitle="Holdings performance, allocation analysis, and risk metrics" icon={<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>} />} />
          <Route path="/reconcile"    element={<Placeholder title="Payment Reconciliation" subtitle="Match external records with internal transactions automatically" icon={<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>} />} />
          <Route path="/alerts"       element={<Placeholder title="Alerts & Monitoring" subtitle="Real-time notifications for budget thresholds and anomalies" icon={<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getStoredKey());

  const handleLogin = useCallback(() => {
    queryClient.clear();
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredKey();
    queryClient.clear();
    setAuthenticated(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {authenticated
          ? <Dashboard onLogout={handleLogout} />
          : <Login onSuccess={handleLogin} />
        }
      </BrowserRouter>
    </QueryClientProvider>
  );
}
