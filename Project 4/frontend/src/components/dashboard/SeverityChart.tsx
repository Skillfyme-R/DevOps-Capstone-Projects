import { ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import type { SecurityPosture } from "@/types";

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "#ef4444", label: "Critical" },
  high:     { color: "#f97316", label: "High" },
  medium:   { color: "#eab308", label: "Medium" },
  low:      { color: "#84cc16", label: "Low" },
  info:     { color: "#06b6d4", label: "Info" },
};

interface SeverityChartProps {
  posture: SecurityPosture;
}

export function SeverityChart({ posture }: SeverityChartProps) {
  const data = Object.entries(posture.severity_breakdown)
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => ({
      name: SEVERITY_CONFIG[severity]?.label ?? severity,
      value: count,
      color: SEVERITY_CONFIG[severity]?.color ?? "#64748b",
    }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
          <span className="text-lg">✓</span>
        </div>
        <p className="text-sm font-medium text-green-400">All Clear</p>
        <p className="mt-1 text-xs text-slate-600">No open findings detected</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-600">Open Findings</p>
      <p className="mb-4 text-2xl font-bold text-white">{total}</p>

      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: "#f8fafc",
              fontSize: 12,
              padding: "8px 12px",
            }}
            formatter={(value: number, name: string) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-500">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-300">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
