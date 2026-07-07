import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Inbox } from 'lucide-react';
import { api, Transaction } from '../services/api';
import { theme } from '../styles/theme';

const statusConfig: Record<string, { bg: string; color: string }> = {
  cleared:  { bg: theme.colors.successBg, color: theme.colors.success },
  pending:  { bg: theme.colors.warningBg, color: theme.colors.warning },
  failed:   { bg: theme.colors.dangerBg,  color: theme.colors.danger },
  reversed: { bg: `${theme.colors.gray400}18`, color: theme.colors.gray500 },
};

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 20, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.5px',
      background: bg, color,
    }}>{label}</span>
  );
}

export function Transactions() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.transactions.list(),
    retry: false,
  });

  const txns: Transaction[] = (data?.transactions ?? []).filter(t =>
    !search ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: theme.font.sans }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: theme.colors.navy, letterSpacing: '-0.5px' }}>
              Transactions
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.colors.gray400 }}>
              All financial events across connected accounts
              {data?.count != null && <span style={{ marginLeft: 8, fontWeight: 600, color: theme.colors.teal }}>{data.count} records</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.colors.gray400, display: 'flex' }}><Search size={14} strokeWidth={2} /></span>
              <input
                style={{
                  padding: '10px 14px 10px 36px',
                  borderRadius: 10,
                  border: `1.5px solid ${theme.colors.gray200}`,
                  fontSize: 13,
                  fontFamily: theme.font.sans,
                  outline: 'none',
                  background: theme.colors.white,
                  color: theme.colors.navy,
                  width: 240,
                  transition: 'border-color 0.15s',
                }}
                placeholder="Search transactions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Total', value: data?.count ?? 0, color: theme.colors.teal },
            { label: 'Cleared', value: (data?.transactions ?? []).filter(t => t.status === 'cleared').length, color: theme.colors.success },
            { label: 'Pending', value: (data?.transactions ?? []).filter(t => t.status === 'pending').length, color: theme.colors.warning },
            { label: 'Failed', value: (data?.transactions ?? []).filter(t => t.status === 'failed').length, color: theme.colors.danger },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: theme.colors.white,
              border: `1px solid ${theme.colors.gray100}`,
              boxShadow: theme.shadow.sm,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
              <span style={{ fontSize: 12, color: theme.colors.gray500 }}>{stat.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.navy }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: theme.colors.white,
        borderRadius: 16,
        border: `1px solid ${theme.colors.gray100}`,
        boxShadow: theme.shadow.sm,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: theme.colors.gray50, borderBottom: `1px solid ${theme.colors.gray200}` }}>
              {['Date', 'Description', 'Category', 'Type', 'Amount', 'Status'].map(h => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '12px 20px',
                  fontSize: 10, fontWeight: 700,
                  color: theme.colors.gray400,
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: theme.colors.gray400 }}>
                  <Loader2 size={28} color={theme.colors.teal} strokeWidth={1.5} style={{ marginBottom: 8, animation: 'spin 1s linear infinite' }} />
                  Loading transactions...
                </td>
              </tr>
            ) : txns.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <Inbox size={40} color={theme.colors.gray200} strokeWidth={1.2} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.navy, marginBottom: 4 }}>
                    {search ? 'No matching transactions' : 'No transactions yet'}
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.gray400 }}>
                    {search ? 'Try a different search term' : 'Create your first transaction via the API'}
                  </div>
                </td>
              </tr>
            ) : txns.map((t, i) => (
              <tr key={t.id} style={{
                borderBottom: `1px solid ${theme.colors.gray100}`,
                background: i % 2 === 0 ? 'transparent' : theme.colors.gray50,
                transition: 'background 0.1s',
              }}>
                <td style={{ padding: '14px 20px', fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.gray500 }}>
                  {new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.navy }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: theme.colors.gray400, marginTop: 2 }}>{t.account_id}</div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Badge label={t.category} bg={`${theme.colors.teal}12`} color={theme.colors.tealDark} />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
                    color: t.type === 'credit' ? theme.colors.success : theme.colors.gray600,
                  }}>
                    {t.type === 'credit' ? '▲ Credit' : '▼ Debit'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', fontFamily: theme.font.mono, fontSize: 14, fontWeight: 700, color: t.type === 'credit' ? theme.colors.success : theme.colors.navy }}>
                  {t.type === 'credit' ? '+' : '−'}{t.amount.currency}&nbsp;
                  {parseFloat(t.amount.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Badge
                    label={t.status}
                    bg={(statusConfig[t.status] || statusConfig.pending).bg}
                    color={(statusConfig[t.status] || statusConfig.pending).color}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
