import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../styles/theme';
import {
  LayoutDashboard, ArrowLeftRight, Receipt, Target,
  TrendingUp, Briefcase, RefreshCcw, Bell, ShieldCheck,
} from 'lucide-react';

const navItems = [
  { label: 'Overview',       path: '/',            Icon: LayoutDashboard, badge: null },
  { label: 'Transactions',   path: '/transactions', Icon: ArrowLeftRight,  badge: null },
  { label: 'Expenses',       path: '/expenses',     Icon: Receipt,         badge: null },
  { label: 'Budgets',        path: '/budgets',      Icon: Target,          badge: null },
  { label: 'Forecasting',    path: '/forecasts',    Icon: TrendingUp,      badge: 'AI' },
  { label: 'Portfolio',      path: '/portfolio',    Icon: Briefcase,       badge: null },
  { label: 'Reconciliation', path: '/reconcile',    Icon: RefreshCcw,      badge: null },
  { label: 'Alerts',         path: '/alerts',       Icon: Bell,            badge: null },
];

interface SidebarProps { onLogout?: () => void; }

export function Sidebar({ onLogout }: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <aside style={{
      width: 260,
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${theme.colors.navy} 0%, #0D2040 50%, ${theme.colors.navyMid} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 100,
      borderRight: `1px solid ${theme.colors.cardBorder}`,
    }}>

      {/* Logo */}
      <div style={{ padding: '26px 22px 18px', borderBottom: `1px solid ${theme.colors.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38,
            background: `linear-gradient(135deg, ${theme.colors.teal} 0%, ${theme.colors.tealDark} 100%)`,
            borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${theme.colors.tealGlow}`,
          }}>
            <ShieldCheck size={20} color={theme.colors.navy} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: theme.colors.white, letterSpacing: '-0.4px', lineHeight: 1.1 }}>
              VaultFlow
            </div>
            <div style={{ fontSize: 9.5, color: theme.colors.teal, letterSpacing: '1.8px', textTransform: 'uppercase', marginTop: 2 }}>
              Financial Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: '18px 22px 8px' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: theme.colors.gray500, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
          Platform
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {navItems.map(({ label, path, Icon, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onMouseEnter={() => setHovered(path)}
            onMouseLeave={() => setHovered(null)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 10,
              marginBottom: 2,
              textDecoration: 'none',
              color: isActive ? theme.colors.white : theme.colors.gray400,
              background: isActive
                ? `linear-gradient(90deg, rgba(0,201,177,0.18) 0%, rgba(0,201,177,0.04) 100%)`
                : hovered === path
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
              borderLeft: isActive ? `2.5px solid ${theme.colors.teal}` : '2.5px solid transparent',
              transition: 'all 0.15s ease',
              fontFamily: theme.font.sans,
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8,
                  background: isActive ? `${theme.colors.teal}22` : 'rgba(255,255,255,0.05)',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}>
                  <Icon size={15} color={isActive ? theme.colors.teal : theme.colors.gray400} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, flex: 1, letterSpacing: '-0.1px' }}>
                  {label}
                </span>
                {badge && (
                  <span style={{
                    fontSize: 8.5, fontWeight: 800,
                    padding: '2px 7px', borderRadius: 20,
                    letterSpacing: '0.8px',
                    background: `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.tealDark})`,
                    color: theme.colors.navy,
                  }}>{badge}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ margin: '0 22px', height: 1, background: theme.colors.cardBorder }} />

      {/* Footer */}
      <div style={{ padding: '14px 22px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: theme.colors.white,
              flexShrink: 0,
            }}>A</div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 9, height: 9, borderRadius: '50%',
              background: theme.colors.success,
              border: `2px solid ${theme.colors.navy}`,
            }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.colors.white, whiteSpace: 'nowrap' }}>Admin</div>
            <div style={{ fontSize: 10, color: theme.colors.gray500, overflow: 'hidden', textOverflow: 'ellipsis' }}>admin@vaultflow.io</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                marginLeft: 'auto', flexShrink: 0,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
                borderRadius: 8, cursor: 'pointer',
                padding: '5px 7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
