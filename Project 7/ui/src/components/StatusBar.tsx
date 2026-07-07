import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { theme } from '../styles/theme';
import { Activity, Server, AlertTriangle } from 'lucide-react';

interface EndpointStatus {
  label: string;
  status: 'checking' | 'ok' | 'error';
  latency?: number;
}

const endpoints: { label: string; check: () => Promise<unknown> }[] = [
  { label: 'API Health',    check: () => api.health() },
  { label: 'Transactions',  check: () => api.transactions.list() },
  { label: 'Expenses',      check: () => api.expenses.summary() },
  { label: 'Budgets',       check: () => api.budgets.variance() },
  { label: 'Forecasts',     check: () => api.forecasts.list() },
  { label: 'Alerts',        check: () => api.alerts.list() },
];

function Dot({ status }: { status: EndpointStatus['status'] }) {
  const color = status === 'ok' ? theme.colors.success : status === 'error' ? theme.colors.danger : theme.colors.warning;
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color,
      boxShadow: status === 'ok' ? `0 0 6px ${theme.colors.success}80` : undefined,
      animation: status === 'checking' ? 'pulse 1s infinite' : undefined,
    }} />
  );
}

export function StatusBar() {
  const [statuses, setStatuses] = useState<EndpointStatus[]>(
    endpoints.map(e => ({ label: e.label, status: 'checking' }))
  );
  const [expanded, setExpanded] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = async () => {
    setStatuses(endpoints.map(e => ({ label: e.label, status: 'checking' })));
    const results = await Promise.all(
      endpoints.map(async (e, i) => {
        const t0 = Date.now();
        try {
          await e.check();
          return { label: e.label, status: 'ok' as const, latency: Date.now() - t0 };
        } catch {
          return { label: e.label, status: 'error' as const, latency: Date.now() - t0 };
        }
      })
    );
    setStatuses(results);
    setLastChecked(new Date());
  };

  useEffect(() => { runChecks(); }, []);

  const okCount = statuses.filter(s => s.status === 'ok').length;
  const errorCount = statuses.filter(s => s.status === 'error').length;
  const allOk = okCount === endpoints.length;
  const summaryColor = allOk ? theme.colors.success : errorCount > 0 ? theme.colors.danger : theme.colors.warning;

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 16, right: 20,
        zIndex: 200,
        fontFamily: theme.font.sans,
      }}>
        {/* Expanded panel */}
        {expanded && (
          <div style={{
            background: theme.colors.navy,
            border: `1px solid ${theme.colors.cardBorder}`,
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: 280,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Server size={14} color={theme.colors.teal} strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.colors.white, letterSpacing: '0.5px' }}>
                  System Status
                </span>
              </div>
              <button
                onClick={runChecks}
                style={{
                  background: `${theme.colors.teal}15`, border: 'none', cursor: 'pointer',
                  color: theme.colors.teal, fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 20, fontFamily: theme.font.sans,
                }}
              >
                Recheck
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {statuses.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot status={s.status} />
                    <span style={{ fontSize: 12.5, color: theme.colors.gray400 }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.latency != null && (
                      <span style={{ fontSize: 10, color: theme.colors.gray500, fontFamily: theme.font.mono }}>
                        {s.latency}ms
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      color: s.status === 'ok' ? theme.colors.success : s.status === 'error' ? theme.colors.danger : theme.colors.warning,
                      background: s.status === 'ok' ? theme.colors.successBg : s.status === 'error' ? theme.colors.dangerBg : theme.colors.warningBg,
                      textTransform: 'uppercase',
                    }}>
                      {s.status === 'checking' ? '...' : s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {lastChecked && (
              <div style={{ marginTop: 12, fontSize: 10, color: theme.colors.gray500, textAlign: 'right' }}>
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.colors.cardBorder}` }}>
              <div style={{ fontSize: 10, color: theme.colors.gray500, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick API Test
              </div>
              <div style={{ fontSize: 10.5, color: theme.colors.gray400, fontFamily: theme.font.mono, lineHeight: 1.7 }}>
                curl -H "X-VaultFlow-API-Key: &lt;your-key&gt;" \<br />
                &nbsp;&nbsp;http://localhost:9090/api/v1/transactions
              </div>
            </div>
          </div>
        )}

        {/* Toggle pill */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: theme.colors.navy,
            border: `1px solid ${theme.colors.cardBorder}`,
            borderRadius: 30,
            padding: '8px 16px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            fontFamily: theme.font.sans,
            transition: 'all 0.15s',
          }}
        >
          {errorCount > 0
            ? <AlertTriangle size={13} color={theme.colors.danger} strokeWidth={2} />
            : <Activity size={13} color={summaryColor} strokeWidth={2} />
          }
          <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.white }}>
            {okCount}/{endpoints.length} Online
          </span>
          <Dot status={allOk ? 'ok' : errorCount > 0 ? 'error' : 'checking'} />
        </button>
      </div>
    </>
  );
}
