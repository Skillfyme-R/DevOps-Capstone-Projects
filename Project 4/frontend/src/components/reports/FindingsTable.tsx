import { useState } from "react";
import { ChevronDown, ChevronRight, FileCode, Link2, EyeOff } from "lucide-react";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { cn } from "@/utils/cn";
import { useSuppressFinding } from "@/hooks/useScans";
import type { Finding } from "@/types";
import { SEVERITY_ORDER } from "@/utils/severity";

interface FindingsTableProps {
  findings: Finding[];
  scanId: string;
}

interface FindingRowProps {
  finding: Finding;
  scanId: string;
}

function FindingRow({ finding, scanId }: FindingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: suppress, isPending } = useSuppressFinding();

  if (finding.is_suppressed) return null;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-slate-400">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={finding.severity} />
        </td>
        <td className="max-w-sm px-4 py-3">
          <p className="truncate text-sm font-medium text-white">{finding.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{finding.category}</p>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-400">
          {finding.scanner}
        </td>
        <td className="px-4 py-3">
          {finding.file_path && (
            <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
              <FileCode className="h-3.5 w-3.5" />
              <span className="max-w-40 truncate">{finding.file_path}</span>
              {finding.line_start && (
                <span className="text-slate-600">:{finding.line_start}</span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {finding.cvss_score != null && (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                finding.cvss_score >= 9
                  ? "text-red-400"
                  : finding.cvss_score >= 7
                  ? "text-orange-400"
                  : finding.cvss_score >= 4
                  ? "text-amber-400"
                  : "text-slate-400"
              )}
            >
              {finding.cvss_score.toFixed(1)}
            </span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-slate-800 bg-slate-950/40">
          <td colSpan={6} className="px-8 py-4">
            <div className="space-y-3">
              <p className="text-sm text-slate-300">{finding.description}</p>

              {finding.remediation && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remediation
                  </p>
                  <p className="text-sm text-slate-300">{finding.remediation}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {finding.cve_id && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                    {finding.cve_id}
                  </span>
                )}
                {finding.cwe_id && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                    {finding.cwe_id}
                  </span>
                )}
              </div>

              {finding.references && finding.references.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {finding.references.map((ref, i) => (
                    <a
                      key={i}
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="h-3 w-3" />
                      Reference {i + 1}
                    </a>
                  ))}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const reason = window.prompt("Suppression reason (min 10 chars):");
                  if (reason && reason.length >= 10) {
                    suppress({ scanId, findingId: finding.id, reason });
                  }
                }}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-600 hover:text-white"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Suppress finding
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function FindingsTable({ findings, scanId }: FindingsTableProps) {
  const sorted = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const visible = sorted.filter((f) => !f.is_suppressed);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-sm text-slate-500">No active findings for this scan.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Severity
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Finding
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scanner
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              CVSS
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((finding) => (
            <FindingRow key={finding.id} finding={finding} scanId={scanId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
