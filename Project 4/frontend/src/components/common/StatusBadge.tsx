import { cn } from "@/utils/cn";
import type { ScanStatus } from "@/types";

interface StatusBadgeProps {
  status: ScanStatus;
  className?: string;
}

const statusConfig: Record<ScanStatus, { label: string; classes: string; dot: string }> = {
  queued:    { label: "Queued",    classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",   dot: "bg-slate-500" },
  running:   { label: "Running",   classes: "bg-blue-500/10 text-blue-400 border-blue-500/20",       dot: "bg-blue-400 animate-pulse" },
  completed: { label: "Completed", classes: "bg-green-500/10 text-green-400 border-green-500/20",    dot: "bg-green-400" },
  failed:    { label: "Failed",    classes: "bg-red-500/10 text-red-400 border-red-500/20",           dot: "bg-red-400" },
  cancelled: { label: "Cancelled", classes: "bg-slate-500/10 text-slate-500 border-slate-500/20",    dot: "bg-slate-600" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, classes, dot } = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        classes,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
