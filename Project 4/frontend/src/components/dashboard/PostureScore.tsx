import { TrendingDown, TrendingUp, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";
import { scoreToGrade } from "@/utils/severity";
import type { SecurityPosture } from "@/types";

interface PostureScoreProps {
  posture: SecurityPosture;
}

const trendConfig = {
  improving: { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10", label: "Improving" },
  stable: { icon: Minus, color: "text-slate-400", bg: "bg-slate-500/10", label: "Stable" },
  degrading: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10", label: "Degrading" },
};

export function PostureScore({ posture }: PostureScoreProps) {
  const { grade } = scoreToGrade(posture.overall_score);
  const trend = trendConfig[posture.trend];
  const TrendIcon = trend.icon;

  const scoreColor =
    posture.overall_score >= 80
      ? "text-green-400"
      : posture.overall_score >= 60
      ? "text-amber-400"
      : "text-red-400";

  const gradeColor =
    grade === "A" || grade === "B"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : grade === "C"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      {/* Background glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl opacity-10",
          posture.overall_score >= 80 ? "bg-green-500" : posture.overall_score >= 60 ? "bg-amber-500" : "bg-red-500"
        )}
      />

      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-600">Security Posture Score</p>
          <div className="mt-3 flex items-end gap-3">
            <span className={cn("text-6xl font-black tabular-nums leading-none", scoreColor)}>
              {posture.overall_score.toFixed(0)}
            </span>
            <div className="mb-1 flex flex-col items-start gap-1">
              <span className="text-sm text-slate-600">/100</span>
              <span className={cn("rounded-lg border px-2.5 py-0.5 text-sm font-black", gradeColor)}>
                {grade}
              </span>
            </div>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <ShieldCheck className={cn("h-6 w-6", scoreColor)} />
        </div>
      </div>

      {/* Trend */}
      <div className={cn("mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5", trend.bg)}>
        <TrendIcon className={cn("h-3.5 w-3.5", trend.color)} />
        <span className={cn("text-xs font-medium", trend.color)}>
          {trend.label} · {posture.scans_this_month} scan{posture.scans_this_month !== 1 ? "s" : ""} this month
        </span>
      </div>

      {/* Severity breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Critical", count: posture.open_critical, cls: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "High", count: posture.open_high, cls: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { label: "Medium", count: posture.open_medium, cls: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Low", count: posture.open_low, cls: "text-lime-400", bg: "bg-lime-500/10 border-lime-500/20" },
        ].map(({ label, count, cls, bg }) => (
          <div key={label} className={cn("rounded-xl border p-3 text-center", bg)}>
            <p className={cn("text-2xl font-bold tabular-nums leading-none", cls)}>{count}</p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
