import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowExecutionApi } from '../api/client';
import { ApiError } from '../api/client';

const SAMPLE_INPUT = `{
  "assetId": "reel-2026-0042",
  "sourceUri": "s3://reelforge-masters/2026/0042.mov",
  "targetRegions": ["US", "UK", "IN"]
}`;

export function StartWorkflowPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workflowName, setWorkflowName] = useState(searchParams.get('name') ?? '');
  const [version, setVersion] = useState(searchParams.get('version') ?? '');
  const [correlationId, setCorrelationId] = useState('');
  const [inputJson, setInputJson] = useState(SAMPLE_INPUT);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setJsonError(null);
    setSubmitError(null);

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = inputJson.trim() ? JSON.parse(inputJson) : {};
    } catch {
      setJsonError('That is not valid JSON — check for trailing commas or unquoted keys.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await workflowExecutionApi.start({
        workflowName: workflowName.trim(),
        version: version.trim() ? Number(version.trim()) : null,
        input: parsedInput,
        correlationId: correlationId.trim() || null,
      });
      navigate(`/workflows/${result.workflowExecutionId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSubmitError(`No workflow definition named "${workflowName}" is registered with Pulsar.`);
      } else if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Could not reach the Pulsar control plane to start this workflow.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Start a Workflow</h1>
          <p className="page-subtitle">Kick off a new execution against a registered workflow definition.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 640 }}>
        {submitError && <div className="error-banner">{submitError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="workflowName">Workflow name</label>
            <input
              id="workflowName"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="video-ingest-pipeline"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="version">Version (optional — omit for latest)</label>
            <input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 2"
              inputMode="numeric"
            />
          </div>
          <div className="form-field">
            <label htmlFor="correlationId">Correlation ID (optional)</label>
            <input
              id="correlationId"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
              placeholder="e.g. title-reel-2026-0042"
            />
          </div>
          <div className="form-field">
            <label htmlFor="input">Input payload (JSON)</label>
            <textarea
              id="input"
              className="json-input"
              rows={10}
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
            />
            {jsonError && <span className="form-error">{jsonError}</span>}
            <span className="form-hint">Passed verbatim as the workflow execution's input map.</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Starting…' : 'Start workflow'}
          </button>
        </form>
      </div>
    </div>
  );
}
