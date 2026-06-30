import { useState } from "react";
import { Link } from "react-router-dom";
import { Scan, ChevronRight, GitBranch, Clock } from "lucide-react";
import { useScans } from "@/hooks/useScans";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TriggerScanModal } from "@/components/scanner/TriggerScanModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/utils/cn";

const SCAN_TYPE_COLORS: Record<string, string> = {
  full: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  sast: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  dast: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  dependency: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  container: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  secret: "bg-red-500/10 text-red-400 border-red-500/20",
  iac: "bg-green-500/10 text-green-400 border-green-500/20",
};

const SCAN_TYPE_LABELS: Record<string, string> = {
  full: "Full Scan",
  sast: "SAST",
  dast: "DAST",
  dependency: "Dependencies",
  container: "Container",
  secret: "Secrets",
  iac: "IaC",
};

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold tabular-nums", color)}>{score.toFixed(0)}</p>
      <p className="text-[10px] text-slate-600">score</p>
    </div>
  );
}

export default function ScansPage() {
  const { data, isLoading } = useScans();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">All Scans</h1>
            <p className="mt-0.5 text-sm text-slate-500">{data?.total ?? 0} total scans recorded</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-blue-400"
          >
            <Scan className="h-4 w-4" />
            New Scan
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <Scan className="h-6 w-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No scans yet</p>
            <p className="mt-1 text-xs text-slate-600">Trigger your first scan to see results here</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-600/30"
            >
              <Scan className="h-4 w-4" />
              New Scan
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_80px_100px_120px_100px_36px] items-center gap-4 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Scan Type", "Branch", "Score", "Findings", "Status", "When", ""].map((h) => (
                <p key={h} className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {h}
                </p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {data.items.map((scan) => (
                <Link
                  key={scan.id}
                  to={`/scans/${scan.id}`}
                  className="group grid grid-cols-[1fr_120px_80px_100px_120px_100px_36px] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  {/* Type */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold capitalize",
                        SCAN_TYPE_COLORS[scan.scan_type] ?? "bg-slate-800 text-slate-400 border-slate-700"
                      )}
                    >
                      {SCAN_TYPE_LABELS[scan.scan_type] ?? scan.scan_type}
                    </span>
                  </div>

                  {/* Branch */}
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    <span className="truncate">{scan.branch}</span>
                  </div>

                  {/* Score */}
                  <div>
                    {scan.security_score != null ? (
                      <ScoreRing score={scan.security_score} />
                    ) : (
                      <span className="text-sm text-slate-600">—</span>
                    )}
                  </div>

                  {/* Findings */}
                  <div className="flex items-center gap-1">
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
                    {scan.critical_count === 0 && scan.high_count === 0 && (
                      <span className="text-xs text-slate-600">
                        {scan.medium_count + scan.low_count} low
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <StatusBadge status={scan.status} />

                  {/* When */}
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-slate-700 transition-colors group-hover:text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && <TriggerScanModal onClose={() => setShowModal(false)} />}
    </>
  );
}
