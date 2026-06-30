import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, GitBranch, GitCommit } from "lucide-react";
import { useScan } from "@/hooks/useScans";
import { FindingsTable } from "@/components/reports/FindingsTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { scoreToGrade } from "@/utils/severity";
import { formatDistanceToNow } from "date-fns";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: scan, isLoading, error } = useScan(id!);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-slate-800/50" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-center">
        <p className="text-slate-400">Scan not found.</p>
        <Link to="/scans" className="mt-4 inline-block text-sm text-brand-400">
          ← Back to scans
        </Link>
      </div>
    );
  }

  const { color } = scoreToGrade(scan.security_score ?? 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/scans"
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to scans
      </Link>

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white capitalize">
                {scan.scan_type} Scan
              </h1>
              <StatusBadge status={scan.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                {scan.branch}
              </span>
              {scan.commit_sha && (
                <span className="flex items-center gap-1 font-mono">
                  <GitCommit className="h-3.5 w-3.5" />
                  {scan.commit_sha.slice(0, 8)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {scan.security_score != null && (
            <div className="text-center">
              <p className={`text-5xl font-black ${color}`}>{scan.security_score.toFixed(0)}</p>
              <p className="mt-1 text-xs text-slate-500">Security Score</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {[
            { label: "Critical", count: scan.critical_count, cls: "text-red-400" },
            { label: "High", count: scan.high_count, cls: "text-orange-400" },
            { label: "Medium", count: scan.medium_count, cls: "text-amber-400" },
            { label: "Low", count: scan.low_count, cls: "text-lime-400" },
            { label: "Info", count: scan.info_count, cls: "text-cyan-400" },
          ].map(({ label, count, cls }) => (
            <div key={label} className="rounded-lg bg-slate-800/50 p-3 text-center">
              <p className={`text-2xl font-bold tabular-nums ${cls}`}>{count}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {scan.error_message && (
          <div className="mt-4 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <strong>Error:</strong> {scan.error_message}
          </div>
        )}
      </div>

      <h2 className="mb-4 text-base font-semibold text-white">
        Findings ({scan.findings.filter((f) => !f.is_suppressed).length})
      </h2>
      <FindingsTable findings={scan.findings} scanId={scan.id} />
    </div>
  );
}
