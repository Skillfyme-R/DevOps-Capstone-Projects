# Monitoring

Pulsar exposes Micrometer metrics through Spring Boot Actuator's Prometheus endpoint. The scrape
config, alert-intent document, and Grafana dashboard already exist under
[`docs/operations/`](operations/) — this page explains how those pieces connect to the actual
metrics the codebase emits, so you can read the dashboard (or extend it) knowing what's real.

## Where metrics come from

- `management.endpoints.web.exposure.include: health,info,prometheus` (`application.yml`) exposes
  `/actuator/health`, `/actuator/info`, and `/actuator/prometheus`.
- `MetricsConfig` (`pulsar-server/.../monitoring/MetricsConfig.java`) registers a `MeterFilter`
  that tags every meter with `application=pulsar-server` — this is why every Prometheus query in
  the shipped dashboard filters on `{application="pulsar-server"}`.
- Three **custom counters** are registered lazily (via `MeterRegistry.counter("name")`, no
  explicit `@Bean`) at their call sites:

| Metric | Registered in | When it increments |
|---|---|---|
| `pulsar_workflow_started_total` | `WorkflowExecutionService.startWorkflow` | Every successful `POST /workflows` |
| `pulsar_workflow_completed_total` | `WorkflowExecutionService.completeWorkflow` | Only when the terminal status is `COMPLETED` (not `FAILED`/`TERMINATED`/`TIMED_OUT`) |
| `pulsar_task_polled_total` | `TaskExecutionService.pollTask` | Every successful (non-empty) poll |

Everything else in the dashboard (`jvm_memory_used_bytes`, `http_server_requests_seconds_*`) comes
free from Spring Boot's auto-configured Micrometer JVM/web instrumentation — no custom code
required.

## Scrape configuration

`docs/operations/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "pulsar-server"
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["pulsar-server:8080"]
        labels:
          application: pulsar-server
          product: pulsar
```

Point this at whatever hostname resolves to `pulsar-server` in your environment (the Docker
Compose service name locally, the `pulsar-server-service` ClusterIP DNS name in Kubernetes). If
you're running Prometheus outside the cluster, you'd instead scrape through the ingress or a
dedicated metrics-only Service/port-forward.

## Grafana dashboard panels

`docs/operations/grafana-dashboard.json` (uid `pulsar-overview`, 30s refresh, last-6h default
window) ships five panels, each backed by a real PromQL query against the metrics above:

| Panel | Query | Reads |
|---|---|---|
| JVM Heap Used | `sum(jvm_memory_used_bytes{application="pulsar-server", area="heap"}) by (instance)` | Auto-instrumented JVM metric |
| JVM Non-Heap Used | same, `area="nonheap"` | Auto-instrumented JVM metric |
| HTTP Request Rate | `sum(rate(http_server_requests_seconds_count{application="pulsar-server"}[5m])) by (uri, status)` | Auto-instrumented Spring MVC metric |
| HTTP p95 Latency | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{...}[5m])) by (le, uri))` | Auto-instrumented Spring MVC metric |
| Workflows Started vs Completed | `sum(rate(pulsar_workflow_started_total[5m]))` and `sum(rate(pulsar_workflow_completed_total[5m]))` | Custom counters above |

A `pulsar_task_polled_total` rate query (`sum(rate(pulsar_task_polled_total[5m])) by (instance)`)
also exists in the dashboard JSON alongside these — use it to see per-replica poll throughput.

Import it into Grafana via **Dashboards → Import → Upload JSON file**, pointing the
`${DS_PROMETHEUS}` datasource variable at your Prometheus instance. There's no automated
provisioning for this yet (see [Future Enhancements](../README.md#future-enhancements) — a real
Grafana-as-code setup is on that list).

## Reading the "started vs completed" gap

Because `pulsar_workflow_completed_total` only increments for `COMPLETED` — not `FAILED`,
`TERMINATED`, or `TIMED_OUT` — a persistent, growing gap between the started rate and the
completed rate does **not** necessarily mean workflows are stuck; it can also mean a real
proportion of workflows are legitimately ending in `TERMINATED` (e.g. the `video-ingest-pipeline`'s
`moderation_decision_ref` routing flagged content to `reject_terminate_ref`) or `FAILED`. Cross-
reference with actual workflow statuses (`GET /workflows/{id}` for specific runs, or a direct query
against `workflow_executions.status`) before treating the gap alone as an incident signal — see
[`docs/operations/alerting-rules.md`](operations/alerting-rules.md)'s "Workflow completion lag"
section, which frames this the same way (a *sustained* elevated started:completed ratio, not any
gap at all).

## Logging

`application.yml` sets `logging.structured.format.console: ecs` — console output is structured in
Elastic Common Schema JSON, suitable for shipping to any ECS-aware log pipeline
(Filebeat/Logstash/OpenSearch, or a cloud log aggregator that understands ECS fields) without a
custom parser. `RequestIdFilter` (`monitoring/RequestIdFilter.java`) attaches a request-correlating
id so a single HTTP request's log lines can be grepped together across the request's lifetime.

Log levels: `root: INFO`, `media.reelforge.pulsar: INFO` by default — bump the latter to `DEBUG`
temporarily when diagnosing a specific issue, but be aware this is a static `application.yml`
value, not runtime-adjustable via an actuator endpoint in this build (no
`/actuator/loggers` override wired beyond Spring Boot's default actuator behavior, which is
present but not documented/exercised here).
