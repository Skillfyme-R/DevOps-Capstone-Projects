import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { DemoDataBanner } from '../components/DemoDataBanner';
import { theme } from '../styles/theme';
import { DollarSign, Bell, Target, Layers, TrendingUp, PieChart, CheckCircle2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(parseFloat(amount));
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: theme.colors.white,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadow.sm,
      border: `1px solid ${theme.colors.gray100}`,
      ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.navy }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: theme.colors.gray400, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

const ACCENT_PALETTE = [
  theme.colors.teal, theme.colors.info, theme.colors.purple, theme.colors.warning, theme.colors.danger,
];

export function Overview() {
  const { data: summary } = useQuery({ queryKey: ['expense-summary'], queryFn: () => api.expenses.summary(), retry: false });
  const { data: alertsData } = useQuery({ queryKey: ['alerts'], queryFn: () => api.alerts.list(), retry: false });
  const { data: varianceData } = useQuery({ queryKey: ['budget-variance'], queryFn: () => api.budgets.variance(), retry: false });
  const { data: txnsData } = useQuery({ queryKey: ['transactions'], queryFn: () => api.transactions.list(), retry: false });

  const totalSpend = summary?.total_spend?.amount ?? '0';
  const currency = summary?.total_spend?.currency ?? 'USD';
  const categories = summary?.categories ?? [];
  const daily = summary?.daily_totals ?? [];
  const alertCount = alertsData?.count ?? 0;
  const criticalCount = alertsData?.alerts?.filter(a => a.severity === 'critical').length ?? 0;
  const exceededBudgets = varianceData?.variance?.filter(v => v.status === 'exceeded').length ?? 0;
  const onTrackBudgets = varianceData?.variance?.filter(v => v.status === 'on_track').length ?? 0;

  const barData = {
    labels: daily.slice(-14).map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Daily Spend',
      data: daily.slice(-14).map(d => parseFloat(d.total.amount)),
      backgroundColor: `${theme.colors.teal}CC`,
      hoverBackgroundColor: theme.colors.teal,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const doughnutData = {
    labels: categories.slice(0, 5).map(c => c.category),
    datasets: [{
      data: categories.slice(0, 5).map(c => parseFloat(c.total.amount)),
      backgroundColor: ACCENT_PALETTE,
      borderWidth: 3,
      borderColor: theme.colors.white,
      hoverBorderColor: theme.colors.white,
    }],
  };

  return (
    <div style={{ fontFamily: theme.font.sans }}>
      <DemoDataBanner />
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.colors.navy} 0%, ${theme.colors.navyMid} 60%, #1E3A5F 100%)`,
        borderRadius: 20,
        padding: '36px 40px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          background: `radial-gradient(circle, ${theme.colors.tealGlow} 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: 200, width: 200, height: 200,
          background: `radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: theme.colors.teal, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
            Financial Intelligence Platform
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 800, color: theme.colors.white, letterSpacing: '-1px' }}>
            Financial Overview
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: theme.colors.gray400, lineHeight: 1.5 }}>
            Real-time intelligence across your financial ecosystem &mdash;&nbsp;
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <MetricCard
          title="Total Spend (30d)"
          value={fmt(totalSpend, currency)}
          subtitle="All accounts combined"
          icon={<DollarSign size={17} strokeWidth={2} />}
          accent={theme.colors.teal}
          trend={-4.2}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Active Alerts"
          value={String(alertCount)}
          subtitle={criticalCount > 0 ? `${criticalCount} critical` : 'No critical issues'}
          icon={<Bell size={17} strokeWidth={2} />}
          accent={criticalCount > 0 ? theme.colors.danger : theme.colors.success}
        />
        <MetricCard
          title="Budgets Exceeded"
          value={String(exceededBudgets)}
          subtitle={onTrackBudgets > 0 ? `${onTrackBudgets} on track` : 'Configure budgets'}
          icon={<Target size={17} strokeWidth={2} />}
          accent={exceededBudgets > 0 ? theme.colors.warning : theme.colors.success}
        />
        <MetricCard
          title="Categories Tracked"
          value={String(categories.length)}
          subtitle={`${txnsData?.count ?? 0} transactions`}
          icon={<Layers size={17} strokeWidth={2} />}
          accent={theme.colors.info}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <SectionTitle title="Daily Spending Trend" subtitle="Last 14 days of activity" />
          {daily.length > 0 ? (
            <Bar data={barData} options={{
              responsive: true,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `$${Number(ctx.raw).toLocaleString()}` } } },
              scales: {
                y: { grid: { color: theme.colors.gray100 }, ticks: { color: theme.colors.gray400, font: { size: 11 }, callback: v => `$${Number(v).toLocaleString()}` } },
                x: { grid: { display: false }, ticks: { color: theme.colors.gray400, font: { size: 11 } } },
              },
            }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.colors.gray400 }}>
              <TrendingUp size={40} color={theme.colors.gray200} strokeWidth={1.2} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No spending data yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add transactions to see trends</div>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Spend by Category" subtitle="Proportional breakdown" />
          {categories.length > 0 ? (
            <div>
              <Doughnut data={doughnutData} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: theme.colors.gray600, padding: 12 } },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.label}: $${Number(ctx.raw).toLocaleString()}` } },
                },
                cutout: '68%',
              }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.colors.gray400 }}>
              <PieChart size={40} color={theme.colors.gray200} strokeWidth={1.2} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No category data</div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row: categories list + alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <SectionTitle title="Top Categories" subtitle="By total spend this period" />
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: theme.colors.gray400, fontSize: 13 }}>No expense data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {categories.slice(0, 6).map((cat, i) => (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT_PALETTE[i % 5], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: theme.colors.gray600, fontWeight: 500 }}>{cat.category}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: theme.colors.gray400 }}>{cat.percentage.toFixed(1)}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.navy, fontFamily: theme.font.mono }}>
                        {fmt(cat.total.amount, cat.total.currency)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: theme.colors.gray100, borderRadius: 3 }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: ACCENT_PALETTE[i % 5],
                      width: `${Math.min(cat.percentage, 100)}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Recent Alerts" subtitle="Unresolved notifications" />
          {(alertsData?.alerts ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: theme.colors.success }}>
              <CheckCircle2 size={40} color={theme.colors.success} strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>All systems healthy</div>
              <div style={{ fontSize: 12, color: theme.colors.gray400, marginTop: 4 }}>No active alerts</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(alertsData?.alerts ?? []).slice(0, 5).map(alert => {
                const colors: Record<string, { bg: string; color: string; dot: string }> = {
                  critical: { bg: theme.colors.dangerBg, color: theme.colors.danger, dot: theme.colors.danger },
                  warning:  { bg: theme.colors.warningBg, color: theme.colors.warning, dot: theme.colors.warning },
                  info:     { bg: theme.colors.infoBg, color: theme.colors.info, dot: theme.colors.info },
                };
                const c = colors[alert.severity] || colors.info;
                return (
                  <div key={alert.id} style={{ padding: '12px 14px', borderRadius: 10, background: c.bg, border: `1px solid ${c.color}25` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.navy }}>{alert.title}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: c.color, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0, marginLeft: 8 }}>
                        {alert.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: theme.colors.gray500, paddingLeft: 15 }}>{alert.message}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
