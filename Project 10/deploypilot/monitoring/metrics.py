"""
Prometheus metrics exposition.
Uses the prometheus-fastapi-instrumentator for automatic HTTP metrics plus
custom business metrics for run lifecycle tracking.
"""
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# ── Custom business metrics ───────────────────────────────────────────────────

runs_total = Counter(
    "deploypilot_runs_total",
    "Total number of infrastructure runs created",
    ["trigger", "status"],
)

run_duration_seconds = Histogram(
    "deploypilot_run_duration_seconds",
    "Time from run creation to completion",
    ["status"],
    buckets=[30, 60, 120, 300, 600, 1200, 1800, 3600],
)

active_runs_gauge = Gauge(
    "deploypilot_active_runs",
    "Number of runs currently in an active (non-terminal) state",
)

approvals_pending_gauge = Gauge(
    "deploypilot_approvals_pending",
    "Number of approval requests currently pending",
)

policy_violations_total = Counter(
    "deploypilot_policy_violations_total",
    "Total policy violations triggered during plan evaluation",
    ["policy_type"],
)


def setup_metrics(app) -> None:
    """Attach the Prometheus instrumentator to a FastAPI app."""
    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/health/live"],
        inprogress_name="deploypilot_inprogress_requests",
        inprogress_labels=True,
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
