import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { actuatorApi } from '../api/client';

const KNOWN_WORKFLOWS = [
  { name: 'video-ingest-pipeline', description: 'Ingests raw masters, probes codecs, and fans out transcode jobs.' },
  { name: 'content-moderation-review', description: 'Runs automated + human moderation gates before publish.' },
  { name: 'regional-licensing-check', description: 'Validates territory rights before a title clears for a region.' },
  { name: 'cdn-refresh-pipeline', description: 'Invalidates and repopulates edge caches after a content update.' },
];

export function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ['actuator-health'],
    queryFn: actuatorApi.health,
    retry: 0,
  });

  const isUp = healthQuery.data?.status === 'UP';

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Mission Control</h1>
          <p className="page-subtitle">Reelforge Media workflow orchestration at a glance.</p>
        </div>
        <Link to="/workflows/start" className="btn btn-primary">
          Start a workflow
        </Link>
      </div>

      <div className="tile-grid">
        <div className="tile">
          <div className="tile-label">Control plane</div>
          <div className={`tile-value ${healthQuery.isLoading ? '' : isUp ? 'ok' : 'down'}`}>
            {healthQuery.isLoading ? 'Checking…' : isUp ? 'Operational' : 'Unreachable'}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Known pipelines</div>
          <div className="tile-value">{KNOWN_WORKFLOWS.length}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Task queue model</div>
          <div className="tile-value" style={{ fontSize: 18 }}>
            SIMPLE tasks only
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Metrics</div>
          <div className="tile-value" style={{ fontSize: 18 }}>
            <Link to="/health" className="link-inline">
              View system health →
            </Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Known pipelines</h2>
          <Link to="/definitions" className="link-inline">
            Browse full catalog →
          </Link>
        </div>
        <p className="form-hint" style={{ marginBottom: 14 }}>
          Pulsar has no bulk workflow-listing endpoint yet — this is the curated set of Reelforge
          Media's demo pipelines. Search for any other registered workflow by name from the
          Workflow Definitions catalog.
        </p>
        <div className="def-list">
          {KNOWN_WORKFLOWS.map((wf) => (
            <Link key={wf.name} to={`/definitions/${wf.name}`} className="def-row">
              <div>
                <div className="def-name">{wf.name}</div>
                <div className="def-meta">{wf.description}</div>
              </div>
              <span className="link-inline">View DAG →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
