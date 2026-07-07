import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BarChart3 } from 'lucide-react';
import { api, VarianceResult } from '../services/api';
import { theme } from '../styles/theme';

const statusConfig: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  on_track:   { bg: theme.colors.successBg, color: theme.colors.success, label: 'On Track',   icon: '✓' },
  warning:    { bg: theme.colors.warningBg, color: theme.colors.warning, label: 'Warning',     icon: '!' },
  exceeded:   { bg: theme.colors.dangerBg,  color: theme.colors.danger,  label: 'Exceeded',   icon: '✗' },
  underspend: { bg: theme.colors.infoBg,    color: theme.colors.info,    label: 'Underspend', icon: '↓' },
};

function BudgetCard({ r }: { r: VarianceResult }) {
  const cfg = statusConfig[r.status] || statusConfig.on_track;
  const utilPct = Math.min(r.utilization * 100, 100);
  const fmtAmt = (amount: string, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(parseFloat(amount));

  return (
    <div style={{
      background: theme.colors.white,
      borderRadius: 16,
      padding: 24,
      border: `1px solid ${theme.colors.gray100}`,
      boxShadow: theme.shadow.sm,
      borderTop: `3px solid ${cfg.color}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.navy, marginBottom: 4 }}>{r.budget.name}</div>
          <div style={{ fontSize: 11, color: theme.colors.gray400 }}>
            {r.budget.category} &middot; {r.budget.period}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 800,
          padding: '4px 10px', borderRadius: 20,
          background: cfg.bg, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          <span>{cfg.icon}</span> {cfg.label}
        </div>
      </div>

      {/* Utilization bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: theme.colors.gray500 }}>Utilization</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color, fontFamily: theme.font.mono }}>
            {(r.utilization * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 8, background: theme.colors.gray100, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${utilPct}%`,
            background: `linear-gradient(90deg, ${cfg.color}AA, ${cfg.color})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Amount breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Allocated', value: fmtAmt(r.budget.allocated.amount, r.budget.allocated.currency), highlight: false },
          { label: 'Actual Spend', value: fmtAmt(r.actual.amount, r.actual.currency), highlight: false },
          {
            label: r.status === 'exceeded' ? 'Over Budget' : 'Remaining',
            value: fmtAmt(Math.abs(parseFloat(r.variance.amount)).toString(), r.variance.currency),
            highlight: true,
          },
        ].map(item => (
          <div key={item.label} style={{
            padding: '10px 12px', borderRadius: 10,
            background: item.highlight ? cfg.bg : theme.colors.gray50,
            border: `1px solid ${item.highlight ? cfg.color + '30' : theme.colors.gray100}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: theme.colors.gray400, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: item.highlight ? cfg.color : theme.colors.navy, fontFamily: theme.font.mono }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Date range */}
      <div style={{ marginTop: 14, fontSize: 11, color: theme.colors.gray400, textAlign: 'right' }}>
        {new Date(r.budget.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –&nbsp;
        {new Date(r.budget.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}

export function Budgets() {
  const { data, isLoading } = useQuery({
    queryKey: ['budget-variance'],
    queryFn: () => api.budgets.variance(),
    retry: false,
  });

  const results: VarianceResult[] = data?.variance ?? [];
  const exceeded = results.filter(r => r.status === 'exceeded').length;
  const onTrack = results.filter(r => r.status === 'on_track').length;
  const warning = results.filter(r => r.status === 'warning').length;

  return (
    <div style={{ fontFamily: theme.font.sans }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: theme.colors.navy, letterSpacing: '-0.5px' }}>
          Budget Tracker
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: theme.colors.gray400 }}>
          Monitor spend against allocated budgets with real-time variance analysis
        </p>
      </div>

      {/* Summary stats */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Budgets', value: results.length, color: theme.colors.teal, bg: `${theme.colors.teal}10` },
            { label: 'On Track', value: onTrack, color: theme.colors.success, bg: theme.colors.successBg },
            { label: 'Warning', value: warning, color: theme.colors.warning, bg: theme.colors.warningBg },
            { label: 'Exceeded', value: exceeded, color: theme.colors.danger, bg: theme.colors.dangerBg },
          ].map(s => (
            <div key={s.label} style={{
              padding: '14px 20px', borderRadius: 12,
              background: s.bg,
              border: `1px solid ${s.color}25`,
              display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: theme.font.mono }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: theme.colors.gray400 }}>
          <Loader2 size={36} color={theme.colors.teal} strokeWidth={1.5} style={{ marginBottom: 12, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14 }}>Loading budget data...</div>
        </div>
      ) : results.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: theme.colors.white,
          borderRadius: 16,
          border: `1px solid ${theme.colors.gray100}`,
          boxShadow: theme.shadow.sm,
        }}>
          <BarChart3 size={48} color={theme.colors.gray200} strokeWidth={1.2} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.navy, marginBottom: 8 }}>No Budgets Configured</div>
          <div style={{ fontSize: 13, color: theme.colors.gray400 }}>Create your first budget via the API to start tracking spend</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {results.map((r, i) => <BudgetCard key={i} r={r} />)}
        </div>
      )}
    </div>
  );
}
