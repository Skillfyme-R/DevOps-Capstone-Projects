import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { workflowExecutionApi, workflowDefinitionApi, ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DagViewer } from '../components/DagViewer';

const ACTIVE_STATUSES = new Set(['RUNNING', 'PAUSED']);

export function ExecutionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const executionQuery = useQuery({
    queryKey: ['workflow-execution', id],
    queryFn: () => workflowExecutionApi.get(id),
    enabled: id.length > 0,
    retry: 0,
    // Poll while the run is live so operators watch task nodes light up in near real time.
    refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 2500 : false),
  });

  const definitionQuery = useQuery({
    queryKey: ['workflow-definition-for-execution', executionQuery.data?.workflowDefinitionId, executionQuery.data?.workflowDefinitionVersion],
    queryFn: () => workflowDefinitionApi.getVersion(executionQuery.data!.workflowDefinitionId, executionQuery.data!.workflowDefinitionVersion),
    enabled: Boolean(executionQuery.data),
    retry: 0,
  });

  function useControlMutation(action: (executionId: string) => Promise<void | { workflowExecutionId: string }>) {
    return useMutation({
      mutationFn: () => action(id),
      onSuccess: (result) => {
        setActionError(null);
        if (result && 'workflowExecutionId' in result) {
          navigate(`/workflows/${result.workflowExecutionId}`);
        } else {
          queryClient.invalidateQueries({ queryKey: ['workflow-execution', id] });
        }
      },
      onError: (err) => {
        setActionError(err instanceof ApiError ? err.message : 'That action could not be completed.');
      },
    });
  }

  const pauseMutation = useControlMutation(workflowExecutionApi.pause);
  const resumeMutation = useControlMutation(workflowExecutionApi.resume);
  const terminateMutation = useControlMutation(workflowExecutionApi.terminate);
  const retryMutation = useControlMutation(workflowExecutionApi.retry);
  const rerunMutation = useControlMutation(workflowExecutionApi.rerun);

  if (executionQuery.isLoading) {
    return (
      <div className="empty-state">
        <span className="spinner-inline" /> Loading execution {id}…
      </div>
    );
  }

  if (executionQuery.isError) {
    const notFound = executionQuery.error instanceof ApiError && executionQuery.error.status === 404;
    return (
      <div className="empty-state">
        <h3>{notFound ? 'No such execution' : 'Could not load this execution'}</h3>
        <p>
          {notFound
            ? `Pulsar has no workflow execution with id ${id}.`
            : 'The Pulsar control plane could not be reached.'}
        </p>
        <Link to="/" className="link-inline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const execution = executionQuery.data!;
  const isRunning = execution.status === 'RUNNING';
  const isPaused = execution.status === 'PAUSED';
  const isTerminal = !ACTIVE_STATUSES.has(execution.status);
  const anyMutationPending =
    pauseMutation.isPending || resumeMutation.isPending || terminateMutation.isPending || retryMutation.isPending || rerunMutation.isPending;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Execution {execution.id.slice(0, 8)}</h1>
          <p className="page-subtitle">
            {execution.correlationId ? `Correlation ID: ${execution.correlationId}` : 'No correlation ID set'}
          </p>
        </div>
        <StatusBadge status={execution.status} />
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="panel">
        <div className="panel-header">
          <h2>Lifecycle controls</h2>
          {isRunning && <span className="form-hint">Auto-refreshing every 2.5s while running…</span>}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-amber" disabled={!isRunning || anyMutationPending} onClick={() => pauseMutation.mutate()}>
            Pause
          </button>
          <button type="button" className="btn" disabled={!isPaused || anyMutationPending} onClick={() => resumeMutation.mutate()}>
            Resume
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isTerminal || anyMutationPending}
            onClick={() => terminateMutation.mutate()}
          >
            Terminate
          </button>
          <button type="button" className="btn" disabled={!isTerminal || anyMutationPending} onClick={() => retryMutation.mutate()}>
            Retry
          </button>
          <button type="button" className="btn" disabled={anyMutationPending} onClick={() => rerunMutation.mutate()}>
            Rerun as new execution
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="kv-grid">
          <div className="kv-item">
            <div className="kv-label">Definition</div>
            <div className="kv-value">
              <Link to={`/definitions/${definitionQuery.data?.name ?? ''}`} className="link-inline">
                {definitionQuery.data?.name ?? execution.workflowDefinitionId} v{execution.workflowDefinitionVersion}
              </Link>
            </div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Started</div>
            <div className="kv-value">{execution.startTime ? new Date(execution.startTime).toLocaleString() : '—'}</div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Ended</div>
            <div className="kv-value">{execution.endTime ? new Date(execution.endTime).toLocaleString() : '—'}</div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Tasks</div>
            <div className="kv-value">{execution.tasks.length}</div>
          </div>
        </div>
      </div>

      {definitionQuery.data && (
        <div className="panel">
          <h2>Execution graph</h2>
          <DagViewer tasks={definitionQuery.data.tasks} taskExecutions={execution.tasks} />
        </div>
      )}

      <div className="panel">
        <h2>Task executions</h2>
        <table className="task-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Status</th>
              <th>Retries</th>
              <th>Worker</th>
              <th>Started</th>
              <th>Ended</th>
            </tr>
          </thead>
          <tbody>
            {execution.tasks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--color-text-muted)' }}>
                  No task executions recorded yet — the decider hasn't scheduled the first task.
                </td>
              </tr>
            ) : (
              execution.tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.taskReferenceName}</td>
                  <td>{task.taskType}</td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>{task.retryCount}</td>
                  <td>{task.workerId ?? '—'}</td>
                  <td>{task.startTime ? new Date(task.startTime).toLocaleTimeString() : '—'}</td>
                  <td>{task.endTime ? new Date(task.endTime).toLocaleTimeString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Input</h2>
        <pre className="json-block">{JSON.stringify(execution.input, null, 2)}</pre>
      </div>

      <div className="panel">
        <h2>Output</h2>
        <pre className="json-block">
          {Object.keys(execution.output ?? {}).length > 0
            ? JSON.stringify(execution.output, null, 2)
            : 'No output yet — this execution has not produced a result.'}
        </pre>
      </div>
    </div>
  );
}
