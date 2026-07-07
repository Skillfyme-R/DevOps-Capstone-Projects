import React from 'react';
import { theme } from '../styles/theme';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, trendLabel, accent = theme.colors.teal, icon }: MetricCardProps) {
  const trendUp = trend !== undefined && trend > 0;
  const trendColor = trend === undefined ? theme.colors.gray400 : trendUp ? theme.colors.success : theme.colors.danger;

  return (
    <div style={{
      background: theme.colors.white,
      borderRadius: 16,
      padding: '22px 24px',
      boxShadow: theme.shadow.sm,
      border: `1px solid ${theme.colors.gray100}`,
      flex: 1,
      minWidth: 200,
      position: 'relative' as const,
      overflow: 'hidden',
      fontFamily: theme.font.sans,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700,
          color: theme.colors.gray500,
          textTransform: 'uppercase' as const, letterSpacing: '0.9px',
        }}>{title}</div>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${accent}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
          }}>{icon}</div>
        )}
      </div>

      <div style={{
        fontSize: 28, fontWeight: 800,
        color: theme.colors.navy,
        fontFamily: theme.font.mono,
        letterSpacing: '-1.2px',
        lineHeight: 1,
        marginBottom: 6,
      }}>{value}</div>

      {subtitle && (
        <div style={{ fontSize: 12, color: theme.colors.gray400, marginBottom: 10 }}>{subtitle}</div>
      )}

      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11.5, fontWeight: 700,
            color: trendColor,
            background: `${trendColor}14`,
            padding: '3px 9px', borderRadius: 20,
          }}>
            {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
          {trendLabel && <span style={{ fontSize: 11, color: theme.colors.gray400 }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
