import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { theme } from '../styles/theme';

interface SectionStatus {
  label: string;
  count: number | null;
  status: 'loading' | 'empty' | 'live' | 'error';
}

export function DemoDataBanner() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [sections, setSections] = useState<SectionStatus[]>([
    { label: 'Transactions', count: null, status: 'loading' },
    { label: 'Expenses',     count: null, status: 'loading' },
    { label: 'Budgets',      count: null, status: 'loading' },
    { label: 'Forecasts',    count: null, status: 'loading' },
    { label: 'Alerts',       count: null, status: 'loading' },
  ]);

  const checkSections = async () => {
    const results = await Promise.all([
      api.transactions.list().then(d => ({ label: 'Transactions', count: d.count, status: d.count > 0 ? 'live' : 'empty' })).catch(() => ({ label: 'Transactions', count: 0, status: 'error' })),
      api.expenses.summary().then(d => ({ label: 'Expenses', count: d.categories?.length ?? 0, status: (d.categories?.length ?? 0) > 0 ? 'live' : 'empty' })).catch(() => ({ label: 'Expenses', count: 0, status: 'error' })),
      api.budgets.variance().then(d => ({ label: 'Budgets', count: d.variance?.length ?? 0, status: (d.variance?.length ?? 0) > 0 ? 'live' : 'empty' })).catch(() => ({ label: 'Budgets', count: 0, status: 'error' })),
      api.forecasts.list().then(d => ({ label: 'Forecasts', count: d.forecasts?.length ?? 0, status: (d.forecasts?.length ?? 0) > 0 ? 'live' : 'empty' })).catch(() => ({ label: 'Forecasts', count: 0, status: 'error' })),
      api.alerts.list().then(d => ({ label: 'Alerts', count: d.count, status: d.count > 0 ? 'live' : 'empty' })).catch(() => ({ label: 'Alerts', count: 0, status: 'error' })),
    ]);
    setSections(results as SectionStatus[]);
    return results;
  };

  useEffect(() => { checkSections(); }, []);

  const allLive = sections.every(s => s.status === 'live');
  const anyEmpty = sections.some(s => s.status === 'empty');
  const anyError = sections.some(s => s.status === 'error');

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.demo.seed();
      await checkSections();
      queryClient.invalidateQueries();
      setSeeded(true);
    } catch (e) {
      console.error('Seed failed', e);
    } finally {
      setSeeding(false);
    }
  };

  const statusIcon = (s: SectionStatus) => {
    if (s.status === 'loading') return <Loader2 size={13} color={theme.colors.gray400} style={{ animation: 'spin 1s linear infinite' }} strokeWidth={2} />;
    if (s.status === 'live')    return <CheckCircle2 size={13} color={theme.colors.success} strokeWidth={2} />;
    if (s.status === 'error')   return <AlertCircle size={13} color={theme.colors.danger} strokeWidth={2} />;
    return <AlertCircle size={13} color={theme.colors.warning} strokeWidth={2} />;
  };

  const statusColor = (s: SectionStatus) =>
    s.status === 'live' ? theme.colors.success :
    s.status === 'error' ? theme.colors.danger :
    s.status === 'loading' ? theme.colors.gray400 :
    theme.colors.warning;

  // If everything is live and user has already seeded, show a compact bar
  if (allLive) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 12, marginBottom: 20,
        background: theme.colors.successBg,
        border: `1px solid ${theme.colors.success}25`,
        fontFamily: theme.font.sans,
      }}>
        <CheckCircle2 size={16} color={theme.colors.success} strokeWidth={2} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.colors.success }}>All sections live</span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          {sections.map(s => (
            <span key={s.label} style={{ fontSize: 11, color: theme.colors.success, background: `${theme.colors.success}15`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              {s.label} {s.count !== null ? `(${s.count})` : ''}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 16, marginBottom: 24,
      border: `1px solid ${anyError ? theme.colors.danger + '30' : theme.colors.warning + '30'}`,
      background: anyError ? theme.colors.dangerBg : `${theme.colors.warning}08`,
      fontFamily: theme.font.sans,
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.colors.gray100}`,
        background: theme.colors.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DatabaseZap size={18} color={theme.colors.warning} strokeWidth={2} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.colors.navy }}>
              {anyError ? 'Some sections have errors' : 'Platform has no data yet'}
            </div>
            <div style={{ fontSize: 11.5, color: theme.colors.gray500, marginTop: 1 }}>
              {anyError
                ? 'Check API connectivity. Use the button to load demo data.'
                : 'Load demo data to see all sections working, or POST your own data via the API.'}
            </div>
          </div>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: seeding ? theme.colors.gray200 : `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.tealDark})`,
            color: seeding ? theme.colors.gray500 : theme.colors.navy,
            fontSize: 12.5, fontWeight: 700, cursor: seeding ? 'not-allowed' : 'pointer',
            fontFamily: theme.font.sans, whiteSpace: 'nowrap' as const,
            boxShadow: seeding ? 'none' : `0 4px 12px ${theme.colors.tealGlow}`,
            transition: 'all 0.2s',
          }}
        >
          {seeding
            ? <><Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
            : <><DatabaseZap size={13} strokeWidth={2} /> Load Demo Data</>
          }
        </button>
      </div>

      {/* Section status grid */}
      <div style={{ display: 'flex', padding: '12px 20px', flexWrap: 'wrap', gap: '8px' }}>
        {sections.map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: theme.colors.white,
            border: `1px solid ${statusColor(s)}25`,
          }}>
            {statusIcon(s)}
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.colors.navy }}>{s.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
              background: `${statusColor(s)}15`, color: statusColor(s),
              textTransform: 'uppercase' as const, letterSpacing: '0.3px',
            }}>
              {s.status === 'loading' ? '...' :
               s.status === 'live' ? `${s.count} records` :
               s.status === 'error' ? 'Error' : 'Empty'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
