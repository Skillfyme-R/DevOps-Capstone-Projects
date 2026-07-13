# Pulsar Alerting Rules

Intent-level description of alert conditions for the Pulsar server fleet. These are
meant to be translated into Alertmanager/Prometheus rule YAML (or the equivalent in
whatever alerting stack Reelforge Media's SRE team standardizes on) — not a fully
wired config here.

## 1. Server down

- **Condition**: `up{job="pulsar-server"} == 0` for more than 1 minute, or fewer than
  half of expected replicas reporting healthy via `/actuator/health`.
- **Threshold**: fire if any target is down for `> 1m`; page if `> 50%` of replicas
  are down for `> 2m`.
- **Why**: a single pod restart is routine (rolling deploys, HPA scale-down); a
  fleet-wide outage blocks all workflow submission and task polling.

## 2. High task failure rate

- **Condition**: ratio of failed task executions to `pulsar_task_polled_total` rises
  sharply over a rolling window.
- **Threshold**: warn if failure ratio `> 10%` over 10 minutes; page if `> 25%` over
  10 minutes.
- **Why**: a spike usually means a worker regression or a downstream dependency
  (e.g. a media-processing backend) outage — needs fast triage before it cascades
  into workflow-level failures.

## 3. Workflow completion lag

- **Condition**: `pulsar_workflow_started_total` rate significantly exceeds
  `pulsar_workflow_completed_total` rate for a sustained period, implying a growing
  backlog of in-flight workflows.
- **Threshold**: warn if the started:completed ratio stays `> 2:1` for `> 15m`.
- **Why**: catches stuck workflows before they pile up and exhaust worker capacity
  or task queue depth.

## 4. Sweeper backlog growing

- **Condition**: time since the scheduler's sweep loop last completed exceeds a
  multiple of `PULSAR_SWEEPER_INTERVAL_MS` (default 30s), or the number of expired
  leases awaiting re-queue keeps increasing across sweeps.
- **Threshold**: warn if sweep latency `> 3x` the configured interval; page if
  `> 10x` (sweeper effectively stalled).
- **Why**: the sweeper is what reclaims expired task leases — if it falls behind,
  timed-out tasks never get retried and workflows silently stall.

## 5. JVM heap pressure

- **Condition**: `jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}`
  sustained above a high watermark.
- **Threshold**: warn at `> 80%` for `> 10m`; page at `> 90%` for `> 5m`.
- **Why**: early warning ahead of GC thrashing or OOM kills, which would otherwise
  surface only as the blunter "server down" alert above.
