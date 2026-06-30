import { useState } from "react";
import { Scan, TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle, Activity, Zap } from "lucide-react";
import { PostureScore } from "@/components/dashboard/PostureScore";
import { SeverityChart } from "@/components/dashboard/SeverityChart";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { TriggerScanModal } from "@/components/scanner/TriggerScanModal";
import { useSecurityPosture, useScans } from "@/hooks/useScans";
import { cn } from "@/utils/cn";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={cn("mt-2 text-3xl font-bold tabular-nums tracking-tight", color)}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color.replace("text-", "bg-").replace("-400", "-500/10").replace("-300", "-500/10"))}>
          <Icon className={cn("h-4.5 w-4.5", color)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-green-400" />}
          {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          {trend === "flat" && <Minus className="h-3.5 w-3.5 text-slate-500" />}
          <span className={cn(trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-500")}>
            {trend === "up" ? "Improving" : trend === "down" ? "Degrading" : "Stable"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [showScanModal, setShowScanModal] = useState(false);
  const { data: posture, isLoading: postureLoading } = useSecurityPosture();
  const { data: scansData, isLoading: scansLoading } = useScans();

  const trendDir = posture?.trend === "improving" ? "up" : posture?.trend === "degrading" ? "down" : "flat";

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Organisation-wide security posture at a glance
            </p>
          </div>
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-blue-400"
          >
            <Scan className="h-4 w-4" />
            New Scan
          </button>
        </div>

        {/* Stat cards */}
        {postureLoading ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : posture ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Posture Score"
              value={`${posture.overall_score.toFixed(0)}/100`}
              icon={ShieldCheck}
              color={posture.overall_score >= 80 ? "text-green-400" : posture.overall_score >= 60 ? "text-amber-400" : "text-red-400"}
              trend={trendDir}
            />
            <StatCard
              label="Critical Findings"
              value={posture.open_critical}
              sub={`${posture.open_high} high · ${posture.open_medium} medium`}
              icon={AlertTriangle}
              color={posture.open_critical > 0 ? "text-red-400" : "text-slate-400"}
            />
            <StatCard
              label="Scans This Month"
              value={posture.scans_this_month}
              sub="across all projects"
              icon={Activity}
              color="text-blue-400"
            />
            <StatCard
              label="Open Low / Info"
              value={posture.open_low + (posture.severity_breakdown.info ?? 0)}
              sub="lower-priority findings"
              icon={Zap}
              color="text-slate-400"
            />
          </div>
        ) : null}

        {/* Score + chart */}
        {postureLoading ? (
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className={cn("h-52 animate-pulse rounded-2xl bg-white/[0.03]", i === 1 ? "lg:col-span-2" : "")} />
            ))}
          </div>
        ) : posture ? (
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PostureScore posture={posture} />
            </div>
            <SeverityChart posture={posture} />
          </div>
        ) : null}

        {/* Recent scans */}
        {scansLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
        ) : (
          <RecentScans scans={scansData?.items.slice(0, 10) ?? []} />
        )}
      </div>

      {showScanModal && <TriggerScanModal onClose={() => setShowScanModal(false)} />}
    </>
  );
}
