import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const KNOWN_WORKFLOWS = [
  'video-ingest-pipeline',
  'content-moderation-review',
  'regional-licensing-check',
  'cdn-refresh-pipeline',
];

export function DefinitionsCatalogPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = search.trim();
    if (trimmed) {
      navigate(`/definitions/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Workflow Definitions</h1>
          <p className="page-subtitle">Look up a registered workflow by name to inspect its DAG.</p>
        </div>
      </div>

      <div className="panel">
        <form className="search-row" onSubmit={handleSearch}>
          <input
            placeholder="Search by exact workflow name, e.g. video-ingest-pipeline"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Look up
          </button>
        </form>
        <p className="form-hint" style={{ marginBottom: 12 }}>
          Pulsar's API resolves definitions by exact name (there is no bulk list endpoint), so
          search here is a direct lookup rather than a fuzzy filter.
        </p>
        <div className="chip-row">
          {KNOWN_WORKFLOWS.map((name) => (
            <button key={name} type="button" className="chip" onClick={() => navigate(`/definitions/${name}`)}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
