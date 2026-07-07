import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Loader2, TrendingDown } from 'lucide-react';
import { api, ForecastResult } from '../services/api';
import { theme } from '../styles/theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(value * 100, 100);
  const color = pct >= 80 ? theme.colors.success : pct >= 60 ? theme.colors.warning : theme.colors.danger;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: theme.colors.gray400 }}>Confidence</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: theme.colors.gray100, borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function ForecastCard({ f, index }: { f: ForecastResult; index: number }) {
  const predicted = parseFloat(f.predicted.amount);
  const lower = parseFloat(f.lower_bound.amount);
  const upper = parseFloat(f.upper_bound.amount);
  const fmtCur = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: f.predicted.currency, maximumFractionDigits: 0 }).format(v);

  const monthLabel = new Date(f.horizon).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shortMonth = new Date(f.horizon).toLocaleDateString('en-US', { month: 'short' });

  return (
    <div style={{
      background: theme.colors.white,
      borderRadius: 16,
      padding: 24,
      border: `1px solid ${theme.colors.gray100}`,
      boxShadow: theme.shadow.sm,
      borderTop: `3px solid ${theme.colors.teal}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        background: `radial-gradient(circle, ${theme.colors.tealGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'inline-block', fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 20,
          background: `${theme.colors.teal}15`, color: theme.colors.tealDark,
          textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8,
        }}>Month {index + 1}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.gray600 }}>{monthLabel}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: theme.colors.gray400, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Predicted Spend</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: theme.colors.navy, fontFamily: theme.font.mono, letterSpacing: '-1px' }}>
          {fmtCur(predicted)}
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 10, background: theme.colors.gray50, border: `1px solid ${theme.colors.gray100}`, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: theme.colors.gray400, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidence Range</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: theme.colors.gray400, marginBottom: 2 }}>Low</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.info, fontFamily: theme.font.mono }}>{fmtCur(lower)}</div>
          </div>
          <div style={{ fontSize: 16, color: theme.colors.gray200 }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: theme.colors.gray400, marginBottom: 2 }}>High</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.warning, fontFamily: theme.font.mono }}>{fmtCur(upper)}</div>
          </div>
        </div>
      </div>

      <ConfidenceBar value={f.confidence} />
    </div>
  );
}

export function Forecasts() {
  const { data, isLoading } = useQuery({
    queryKey: ['forecasts'],
    queryFn: () => api.forecasts.list(),
    retry: false,
  });

  const forecasts: ForecastResult[] = data?.forecasts ?? [];

  const chartData = {
    labels: forecasts.map(f => new Date(f.horizon).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Upper Bound',
        data: forecasts.map(f => parseFloat(f.upper_bound.amount)),
        borderColor: 'transparent',
        backgroundColor: `${theme.colors.teal}18`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        order: 3,
      },
      {
        label: 'Lower Bound',
        data: forecasts.map(f => parseFloat(f.lower_bound.amount)),
        borderColor: 'transparent',
        backgroundColor: theme.colors.white,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        order: 2,
      },
      {
        label: 'Predicted Spend',
        data: forecasts.map(f => parseFloat(f.predicted.amount)),
        borderColor: theme.colors.teal,
        backgroundColor: theme.colors.teal,
        fill: false,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: theme.colors.white,
        pointBorderColor: theme.colors.teal,
        pointBorderWidth: 2,
        borderWidth: 2.5,
        order: 1,
      },
    ],
  };

  return (
    <div style={{ fontFamily: theme.font.sans }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: theme.colors.navy, letterSpacing: '-0.5px' }}>
            Spending Forecast
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 800,
            padding: '4px 10px', borderRadius: 20,
            background: `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.tealDark})`,
            color: theme.colors.navy, letterSpacing: '1px',
          }}>AI</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: theme.colors.gray400 }}>
          Linear regression forecast with confidence intervals — powered by historical transaction data
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: theme.colors.gray400 }}>
          <Loader2 size={36} color={theme.colors.teal} strokeWidth={1.5} style={{ marginBottom: 12, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14 }}>Generating forecast model...</div>
        </div>
      ) : forecasts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: theme.colors.white, borderRadius: 16,
          border: `1px solid ${theme.colors.gray100}`,
          boxShadow: theme.shadow.sm,
        }}>
          <TrendingDown size={48} color={theme.colors.gray200} strokeWidth={1.2} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.navy, marginBottom: 8 }}>Insufficient Historical Data</div>
          <div style={{ fontSize: 13, color: theme.colors.gray400 }}>
            Add more transactions to enable AI-powered spending predictions
          </div>
        </div>
      ) : (
        <>
          {/* Line chart */}
          <div style={{
            background: theme.colors.white,
            borderRadius: 16,
            padding: 28,
            border: `1px solid ${theme.colors.gray100}`,
            boxShadow: theme.shadow.sm,
            marginBottom: 24,
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.navy }}>Spend Projection</div>
              <div style={{ fontSize: 12, color: theme.colors.gray400, marginTop: 2 }}>Shaded area shows confidence interval</div>
            </div>
            <Line data={chartData} options={{
              responsive: true,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    boxWidth: 10, font: { size: 12 }, color: theme.colors.gray500, padding: 16,
                    filter: item => item.text !== 'Lower Bound',
                  },
                },
                tooltip: {
                  callbacks: {
                    label: ctx => ctx.dataset.label === 'Lower Bound' ? '' : ` ${ctx.dataset.label}: $${Number(ctx.raw).toLocaleString()}`,
                  },
                },
              },
              scales: {
                y: {
                  grid: { color: theme.colors.gray100 },
                  ticks: { color: theme.colors.gray400, font: { size: 11 }, callback: v => `$${Number(v).toLocaleString()}` },
                },
                x: { grid: { display: false }, ticks: { color: theme.colors.gray400, font: { size: 11 } } },
              },
            }} />
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {forecasts.map((f, i) => <ForecastCard key={i} f={f} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
