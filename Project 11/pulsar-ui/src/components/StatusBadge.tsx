import type { TaskExecutionStatus, WorkflowStatus } from '../api/types';

interface Props {
  status: WorkflowStatus | TaskExecutionStatus;
}

export function StatusBadge({ status }: Props) {
  const cssClass = `status-badge status-${status.toLowerCase()}`;
  return (
    <span className={cssClass}>
      <span className="status-dot" />
      {status.replaceAll('_', ' ')}
    </span>
  );
}
