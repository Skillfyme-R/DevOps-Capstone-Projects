import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/definitions', label: 'Workflow Definitions' },
  { to: '/workflows/start', label: 'Start Workflow' },
  { to: '/health', label: 'System Health' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-title">Pulsar</div>
            <div className="brand-subtitle">Reelforge Media</div>
          </div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8 }}>Signed in as {username ?? 'unknown'}</div>
          <button type="button" className="btn" style={{ width: '100%' }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
