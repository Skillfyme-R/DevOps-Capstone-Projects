import type { TaskDefinitionRefDto, TaskExecutionResponse, TaskExecutionStatus, TaskType } from '../api/types';

interface DagViewerProps {
  tasks: TaskDefinitionRefDto[];
  taskExecutions?: TaskExecutionResponse[];
}

interface LayoutNode {
  ref: string;
  taskType: TaskType;
  depth: number;
  x: number;
  y: number;
}

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 48;
const ROW_GAP = 30;

const TASK_TYPE_COLOR: Record<TaskType, string> = {
  SIMPLE: '#4338ca',
  FORK: '#7c3aed',
  JOIN: '#7c3aed',
  DECISION: '#0891b2',
  SUB_WORKFLOW: '#0e7490',
  DYNAMIC: '#0e7490',
  TERMINATE: '#64748b',
};

const EXEC_STATUS_COLOR: Record<TaskExecutionStatus, string> = {
  SCHEDULED: '#f59e0b',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  FAILED_WITH_TERMINAL_ERROR: '#dc2626',
  TIMED_OUT: '#dc2626',
  CANCELED: '#64748b',
  SKIPPED: '#64748b',
};

// Forward edges (next/joinOn/decisionCases) let us walk the graph to assign each node a
// depth (longest path from a root), then lay out top-to-bottom in depth rows — cheap and
// deterministic for the modest DAG sizes Pulsar workflows have, without pulling in a graph library.
function computeLayout(tasks: TaskDefinitionRefDto[]): { nodes: LayoutNode[]; edges: [string, string][]; width: number; height: number } {
  const byRef = new Map(tasks.map((t) => [t.taskReferenceName, t]));
  const edges: [string, string][] = [];
  const incoming = new Set<string>();

  for (const t of tasks) {
    const targets = new Set<string>([...t.next, ...t.defaultCase, ...Object.values(t.decisionCases).flat()]);
    for (const target of targets) {
      if (byRef.has(target)) {
        edges.push([t.taskReferenceName, target]);
        incoming.add(target);
      }
    }
    for (const joinDep of t.joinOn) {
      if (byRef.has(joinDep)) {
        edges.push([joinDep, t.taskReferenceName]);
        incoming.add(t.taskReferenceName);
      }
    }
  }

  const depth = new Map<string, number>();
  const roots = tasks.filter((t) => !incoming.has(t.taskReferenceName));
  const queue: string[] = roots.length > 0 ? roots.map((r) => r.taskReferenceName) : tasks.slice(0, 1).map((t) => t.taskReferenceName);
  for (const r of queue) depth.set(r, 0);

  const adjacency = new Map<string, string[]>();
  for (const [from, to] of edges) {
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  }

  let head = 0;
  const visited = new Set<string>();
  while (head < queue.length) {
    const current = queue[head++];
    if (visited.has(current)) continue;
    visited.add(current);
    const currentDepth = depth.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      const candidate = currentDepth + 1;
      if ((depth.get(next) ?? -1) < candidate) {
        depth.set(next, candidate);
      }
      queue.push(next);
    }
  }

  for (const t of tasks) {
    if (!depth.has(t.taskReferenceName)) {
      depth.set(t.taskReferenceName, 0);
    }
  }

  const rows = new Map<number, string[]>();
  for (const t of tasks) {
    const d = depth.get(t.taskReferenceName) ?? 0;
    rows.set(d, [...(rows.get(d) ?? []), t.taskReferenceName]);
  }

  const nodes: LayoutNode[] = [];
  const maxRowSize = Math.max(1, ...Array.from(rows.values()).map((r) => r.length));
  const width = maxRowSize * (NODE_W + COL_GAP) + COL_GAP;

  for (const [d, refs] of Array.from(rows.entries()).sort((a, b) => a[0] - b[0])) {
    const rowWidth = refs.length * (NODE_W + COL_GAP) - COL_GAP;
    const startX = (width - rowWidth) / 2;
    refs.forEach((ref, i) => {
      const task = byRef.get(ref)!;
      nodes.push({
        ref,
        taskType: task.taskType,
        depth: d,
        x: startX + i * (NODE_W + COL_GAP),
        y: d * (NODE_H + ROW_GAP) + ROW_GAP,
      });
    });
  }

  const maxDepth = Math.max(0, ...Array.from(rows.keys()));
  const height = (maxDepth + 1) * (NODE_H + ROW_GAP) + ROW_GAP;

  return { nodes, edges, width: Math.max(width, 320), height };
}

export function DagViewer({ tasks, taskExecutions }: DagViewerProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <h3>No tasks in this definition</h3>
        <p>This workflow definition has an empty DAG.</p>
      </div>
    );
  }

  const { nodes, edges, width, height } = computeLayout(tasks);
  const nodeByRef = new Map(nodes.map((n) => [n.ref, n]));
  const execByRef = new Map((taskExecutions ?? []).map((e) => [e.taskReferenceName, e]));

  return (
    <div className="dag-wrapper">
      <svg className="dag-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5b6a94" />
          </marker>
        </defs>
        {edges.map(([from, to], i) => {
          const a = nodeByRef.get(from);
          const b = nodeByRef.get(to);
          if (!a || !b) return null;
          const x1 = a.x + NODE_W / 2;
          const y1 = a.y + NODE_H;
          const x2 = b.x + NODE_W / 2;
          const y2 = b.y;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${from}-${to}-${i}`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke="#5b6a94"
              strokeWidth={1.5}
              markerEnd="url(#dag-arrow)"
            />
          );
        })}
        {nodes.map((n) => {
          const exec = execByRef.get(n.ref);
          const borderColor = exec ? EXEC_STATUS_COLOR[exec.status] : TASK_TYPE_COLOR[n.taskType];
          return (
            <g key={n.ref} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill="#161f38"
                stroke={borderColor}
                strokeWidth={exec ? 2.5 : 1.5}
              />
              <text x={12} y={22} className="dag-node-label">
                {n.ref.length > 20 ? `${n.ref.slice(0, 19)}…` : n.ref}
              </text>
              <text x={12} y={38} className="dag-node-sublabel">
                {n.taskType}
                {exec ? ` · ${exec.status.replaceAll('_', ' ')}` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
