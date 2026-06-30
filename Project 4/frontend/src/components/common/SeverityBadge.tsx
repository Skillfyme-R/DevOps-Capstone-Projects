import { cn } from "@/utils/cn";
import { severityClass, severityLabel } from "@/utils/severity";
import type { Severity } from "@/types";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        severityClass(severity),
        className
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}
