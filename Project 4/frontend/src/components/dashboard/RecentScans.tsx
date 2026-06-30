import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/common/StatusBadge";
import { GitBranch, ChevronRight, Scan } from "lucide-react";
import type { ScanSummary } from "@/types";
import { cn } from "@/utils/cn";

interface RecentScansProps {
  scans: ScanSummary[];
}

const SCAN_TYPE_COLORS: Record<string, string> = {
  full: "bg-violet-500/10 text-violet-400",
  sast: "bg-blue-500/10 text-blue-400",
  dast: "bg-orange-500/10 text-orange-400",
  dependency: "bg-amber-500/10 text-amber-400",
  container: "bg-cyan-500/10 text-cyan-400",
  secret: "bg-red-500/10 text-red-400",
  iac: "bg-green-500/10 text-green-400",
};

const SCAN_TYPE_LABELS: Record<string, string> = {
  full: "Full Scan", sast: "SAST", dast: "DAST",
  dependency: "Deps", container: "Container",
  secret: "Secrets", iac: "IaC",
};

export function RecentScans({ scans }: RecentScansProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">Recent Scans</h3>
        </div>
        <Link
          to="/scans"
          className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {scans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <Scan className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-500">No scans yet</p>
          <p className="mt-1 text-xs text-slate-600">Trigger your first scan from the New Scan button</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {scans.map((scan) => (
            <li key={scan.id}>
              <Link
                to={`/scans/${scan.id}`}
                className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.03]"
              >
                {/* Type badge */}
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold",
                    SCAN_TYPE_COLORS[scan.scan_type] ?? "bg-slate-800 text-slate-400"
                  )}
                >
                  {SCAN_TYPE_LABELS[scan.scan_type] ?? scan.scan_type}
                </span>

                {/* Branch + time */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3 shrink-0 text-slate-600" />
                    <span className="truncate font-mono text-xs text-slate-500">{scan.branch}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-700">
                    {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Score */}
                {scan.status === "completed" && scan.security_score != null && (
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        scan.security_score >= 80
                          ? "text-green-400"
                          : scan.security_score >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                      )}
                    >
                      {scan.security_score.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-slate-700">score</p>
                  </div>
                )}

                {/* Severity pills */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {scan.critical_count > 0 && (
                    <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                      {scan.critical_count}C
                    </span>
                  )}
                  {scan.high_count > 0 && (
                    <span className="rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
                      {scan.high_count}H
                    </span>
                  )}
                  <StatusBadge status={scan.status} />
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-slate-700 transition-colors group-hover:text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
