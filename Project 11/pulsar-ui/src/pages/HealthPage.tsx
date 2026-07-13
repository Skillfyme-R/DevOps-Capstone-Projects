import { useQuery } from '@tanstack/react-query';
import { actuatorApi, API_BASE_URL } from '../api/client';

export function HealthPage() {
  const healthQuery = useQuery({
    queryKey: ['actuator-health-full'],
    queryFn: actuatorApi.health,
    retry: 0,
    refetchInterval: 10000,
  });

  const infoQuery = useQuery({
    queryKey: ['actuator-info'],
    queryFn: actuatorApi.info,
    retry: 0,
  });

  const components = healthQuery.data?.components ?? {};

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">Live status from the Pulsar control plane's Actuator endpoints.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Overall status</h2>
        </div>
        {healthQuery.isLoading ? (
          <p className="form-hint">Checking control plane health…</p>
        ) : healthQuery.isError ? (
          <div className="empty-state">
            <h3>Health endpoint unreachable</h3>
            <p>
              Could not reach <code>{API_BASE_URL}/actuator/health</code>. Confirm pulsar-server is
              running and that this dashboard's VITE_API_BASE_URL points at the right host.
            </p>
          </div>
        ) : (
          <div className="health-row">
            <span>Aggregate status</span>
            <span className={`tile-value ${healthQuery.data?.status === 'UP' ? 'ok' : 'down'}`} style={{ fontSize: 16 }}>
              {healthQuery.data?.status}
            </span>
          </div>
        )}
      </div>

      {Object.keys(components).length > 0 && (
        <div className="panel">
          <h2>Component breakdown</h2>
          <div className="health-grid">
            {Object.entries(components).map(([name, component]) => (
              <div key={name} className="health-row">
                <span style={{ textTransform: 'capitalize' }}>{name}</span>
                <span className={component.status === 'UP' ? 'tile-value ok' : 'tile-value down'} style={{ fontSize: 14 }}>
                  {component.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Build info</h2>
        {infoQuery.data && Object.keys(infoQuery.data).length > 0 ? (
          <pre className="json-block">{JSON.stringify(infoQuery.data, null, 2)}</pre>
        ) : (
          <p className="form-hint">No build info published by pulsar-server's /actuator/info endpoint.</p>
        )}
      </div>

      <div className="panel">
        <h2>Metrics</h2>
        <p className="form-hint" style={{ marginBottom: 12 }}>
          Detailed time-series metrics (task queue depth, decider latency, worker throughput) are
          scraped by Prometheus and visualized in Grafana — this dashboard intentionally doesn't
          duplicate that view.
        </p>
        <a className="link-inline" href={`${API_BASE_URL}/actuator/prometheus`} target="_blank" rel="noreferrer">
          Open raw Prometheus metrics →
        </a>
      </div>
    </div>
  );
}
