import { useState, useRef, useMemo } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Scan, LogOut, Shield, Bell, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { NotificationPanel } from "@/components/common/NotificationPanel";
import type { AppNotification } from "@/components/common/NotificationPanel";
import { useScans, useSecurityPosture } from "@/hooks/useScans";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/utils/cn";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ScansPage from "@/pages/ScansPage";
import ScanDetailPage from "@/pages/ScanDetailPage";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/scans", icon: Scan, label: "Scans" },
];

function useNotifications(): AppNotification[] {
  const { data: scans } = useScans();
  const { data: posture } = useSecurityPosture();
  const { data: projects } = useProjects();

  return useMemo(() => {
    // Build project id → name lookup
    const projectName: Record<string, string> = {};
    for (const p of projects?.items ?? []) {
      projectName[p.id] = p.name;
    }

    const list: AppNotification[] = [];
    const now = new Date().toISOString();

    // 1. Overall posture score warning
    if (posture && posture.overall_score < 50) {
      list.push({
        id: "posture-critical",
        type: "critical",
        title: `Posture score critical: ${posture.overall_score.toFixed(0)}/100`,
        body: `Your organisation's security score is dangerously low. Immediate remediation required.`,
        href: "/",
        time: now,
      });
    } else if (posture?.trend === "degrading") {
      list.push({
        id: "posture-degrading",
        type: "degrading",
        title: "Security posture is degrading",
        body: `Score dropped to ${posture.overall_score.toFixed(0)}/100. Review recent scan findings.`,
        href: "/",
        time: now,
      });
    }

    // 2. Open critical findings across the org
    if (posture && posture.open_critical > 0) {
      list.push({
        id: "open-critical",
        type: "critical",
        title: `${posture.open_critical} critical finding${posture.open_critical > 1 ? "s" : ""} unresolved`,
        body: `${posture.open_high} high · ${posture.open_medium} medium also open. Review and remediate now.`,
        href: "/scans",
        time: now,
      });
    }

    // 3. Per-project critical alerts from top_vulnerable_projects
    const seenProjects = new Set<string>();
    for (const vp of posture?.top_vulnerable_projects ?? []) {
      if (vp.critical > 0 && !seenProjects.has(vp.project_id)) {
        seenProjects.add(vp.project_id);
        const name = projectName[vp.project_id] ?? "Unknown project";
        list.push({
          id: `proj-crit-${vp.project_id}`,
          type: "critical",
          title: `${name}: ${vp.critical} critical issue${vp.critical > 1 ? "s" : ""}`,
          body: `Security score ${vp.score.toFixed(0)}/100. Critical vulnerabilities need immediate attention.`,
          href: "/scans",
          time: now,
        });
      }
    }

    // 4. Per-scan notifications with project name
    for (const scan of scans?.items ?? []) {
      const name = projectName[scan.project_id] ?? "Unknown project";
      const typeLabel = scan.scan_type.toUpperCase();

      if (scan.status === "failed") {
        list.push({
          id: `failed-${scan.id}`,
          type: "failed",
          title: `Scan failed — ${name}`,
          body: `${typeLabel} scan on branch "${scan.branch}" did not complete successfully.`,
          href: `/scans/${scan.id}`,
          time: scan.created_at,
        });
      } else if (scan.status === "completed" && scan.critical_count > 0) {
        list.push({
          id: `crit-scan-${scan.id}`,
          type: "critical",
          title: `${scan.critical_count} critical in ${name}`,
          body: `${typeLabel} scan on "${scan.branch}" — score ${scan.security_score?.toFixed(0) ?? "?"}/100. ${scan.high_count} high also detected.`,
          href: `/scans/${scan.id}`,
          time: scan.created_at,
        });
      } else if (scan.status === "completed" && scan.high_count > 0 && scan.critical_count === 0) {
        list.push({
          id: `high-scan-${scan.id}`,
          type: "degrading",
          title: `${scan.high_count} high severity in ${name}`,
          body: `${typeLabel} scan on "${scan.branch}" — score ${scan.security_score?.toFixed(0) ?? "?"}/100. No criticals, but high issues need review.`,
          href: `/scans/${scan.id}`,
          time: scan.created_at,
        });
      } else if (scan.status === "completed" && (scan.security_score ?? 0) >= 90) {
        list.push({
          id: `clean-${scan.id}`,
          type: "completed",
          title: `Clean scan — ${name}`,
          body: `${typeLabel} on "${scan.branch}" scored ${scan.security_score?.toFixed(0)}/100 with no critical or high issues.`,
          href: `/scans/${scan.id}`,
          time: scan.created_at,
        });
      }
    }

    // Deduplicate by id, sort newest first, cap at 10
    const seen = new Set<string>();
    return list
      .filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  }, [scans, posture, projects]);
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notifications = useNotifications();
  const notifCount = Math.min(notifications.length, 9);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="flex h-screen overflow-hidden bg-[#080d14]">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b1120]">
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
            <Shield className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Shield<span className="text-blue-400">Grid</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Main Menu
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-600/15 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User area */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{user?.full_name ?? "—"}</p>
              <p className="truncate text-[10px] capitalize text-slate-500">{user?.role ?? "member"}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b1120]/80 px-6 backdrop-blur">
          <div />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
              >
                <Bell className="h-4 w-4" />
                {notifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
                    {notifCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  anchorRef={bellRef}
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-[11px] font-bold text-white">
                {initials}
              </div>
              <span className="text-xs font-medium text-slate-300">{user?.full_name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="scans" element={<ScansPage />} />
                <Route path="scans/:id" element={<ScanDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
