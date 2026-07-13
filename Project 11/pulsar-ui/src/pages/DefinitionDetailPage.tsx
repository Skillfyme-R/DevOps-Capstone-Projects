import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { workflowDefinitionApi } from '../api/client';
import { ApiError } from '../api/client';
import { DagViewer } from '../components/DagViewer';

export function DefinitionDetailPage() {
  const { name = '' } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const definitionQuery = useQuery({
    queryKey: ['workflow-definition', name],
    queryFn: () => workflowDefinitionApi.getLatest(name),
    enabled: name.length > 0,
    retry: 0,
  });

  const versionsQuery = useQuery({
    queryKey: ['workflow-definition-versions', name],
    queryFn: () => workflowDefinitionApi.getAllVersions(name),
    enabled: name.length > 0,
    retry: 0,
  });

  if (definitionQuery.isLoading) {
    return (
      <div className="empty-state">
        <span className="spinner-inline" /> Loading {name}…
      </div>
    );
  }

  if (definitionQuery.isError) {
    const notFound = definitionQuery.error instanceof ApiError && definitionQuery.error.status === 404;
    return (
      <div>
        <div className="topbar">
          <div>
            <h1 className="page-title">{name}</h1>
          </div>
        </div>
        <div className="empty-state">
          <h3>{notFound ? 'No such workflow definition' : 'Could not load this definition'}</h3>
          <p>
            {notFound
              ? `Reelforge Media has no registered workflow named "${name}". Check the spelling or register it via POST /workflow-definitions.`
              : 'The Pulsar control plane could not be reached. Confirm pulsar-server is running.'}
          </p>
          <Link to="/definitions" className="link-inline">
            ← Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  const def = definitionQuery.data!;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">{def.name}</h1>
          <p className="page-subtitle">{def.description || 'No description provided.'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate(`/workflows/start?name=${encodeURIComponent(def.name)}&version=${def.version}`)}>
          Start this workflow
        </button>
      </div>

      <div className="panel">
        <div className="kv-grid">
          <div className="kv-item">
            <div className="kv-label">Version</div>
            <div className="kv-value">
              v{def.version}
              {versionsQuery.data && versionsQuery.data.length > 1 && (
                <span className="form-hint"> ({versionsQuery.data.length} versions registered)</span>
              )}
            </div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Owner</div>
            <div className="kv-value">{def.ownerEmail}</div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Timeout</div>
            <div className="kv-value">{def.timeoutSeconds}s</div>
          </div>
          <div className="kv-item">
            <div className="kv-label">Created</div>
            <div className="kv-value">{new Date(def.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Task graph</h2>
          <span className="form-hint">{def.tasks.length} tasks</span>
        </div>
        <DagViewer tasks={def.tasks} />
      </div>

      <div className="panel">
        <h2>Task reference</h2>
        <table className="task-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Next</th>
              <th>Join on</th>
            </tr>
          </thead>
          <tbody>
            {def.tasks.map((t) => (
              <tr key={t.taskReferenceName}>
                <td>{t.taskReferenceName}</td>
                <td>{t.taskType}</td>
                <td>{t.next.join(', ') || '—'}</td>
                <td>{t.joinOn.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
