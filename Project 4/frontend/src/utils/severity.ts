import type { Severity } from "@/types";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function severityLabel(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function severityClass(s: Severity): string {
  const map: Record<Severity, string> = {
    critical: "severity-critical",
    high: "severity-high",
    medium: "severity-medium",
    low: "severity-low",
    info: "severity-info",
  };
  return map[s];
}

export function scoreToGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A", color: "text-lime-400" };
  if (score >= 75) return { grade: "B", color: "text-green-400" };
  if (score >= 60) return { grade: "C", color: "text-amber-400" };
  if (score >= 40) return { grade: "D", color: "text-orange-400" };
  return { grade: "F", color: "text-red-400" };
}
