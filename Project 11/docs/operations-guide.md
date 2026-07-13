# Operations Guide (Day 2)

Practical guidance for running Pulsar once it's deployed: the timeout sweeper, inspecting stuck
workflows, secret rotation, and Postgres backup considerations.

## How the timeout sweeper works

`TaskTimeoutSweeper` (`pulsar-server/.../scheduler/TaskTimeoutSweeper.java`) is a
`@Scheduled(fixedDelayString = "${pulsar.scheduler.sweep-interval-ms:30000}")` job — every 30
seconds by default (`PULSAR_SWEEPER_INTERVAL_MS`).

Each sweep:

1. Queries `task_executions` for every row with `status = IN_PROGRESS` and a non-null
   `start_time`.
2. For each, computes `leaseExpiresAt = startTime + callbackAfterSeconds`.
3. If `leaseExpiresAt` is before now, calls
   `TaskExecutionService.failTask(id, "Lease expired: worker did not complete/heartbeat in time", terminal=false)`
   — routing it through the exact same retry-vs-terminal-fail logic a worker's own reported
   failure would use.

This is deliberately **redundant** with `RedisTaskQueue`'s own lease-expiry reclaim (the Lua script
in `poll()` that moves expired ZSET entries back onto the queue list): the Redis-side mechanism
only reclaims a lease when *something else polls that same queue topic again*. If a task type's
queue goes cold (no worker is polling it anymore — e.g. the worker fleet for that task type
crashed entirely), Redis-side reclaim never fires. The database-side sweeper catches that case
independently, because it doesn't depend on anyone calling `poll()`.

**Tuning**: lower `PULSAR_SWEEPER_INTERVAL_MS` for faster stuck-task detection at the cost of more
frequent full-table scans of `IN_PROGRESS` rows; the default 30s is a reasonable balance for a
system without enormous in-flight task volume.

## Inspecting stuck workflows

A workflow that looks "stuck" is one where `GET /api/pulsar/v1/workflows/{id}` keeps returning
`status: RUNNING` with no change in `tasks[]` over time. Diagnostic steps:

1. **Pull the execution detail** (via the UI's Execution Detail page, which auto-refreshes every
   2.5s while `RUNNING`, or directly via the API) and look at the last task's `status`:
   - `SCHEDULED` for a long time → nobody is polling that task's queue topic. Check that a worker
     process for that task type is actually running and pointed at the right server.
   - `IN_PROGRESS` for longer than its lease → either the worker crashed mid-task (the sweeper
     should reclaim it within `PULSAR_SWEEPER_INTERVAL_MS`) or it's a legitimately long-running
     task whose `callbackAfterSeconds` lease is too short — extend it via
     `PUT /tasks/{id}/lease` before it expires, or increase `PULSAR_DEFAULT_LEASE_SECONDS`.
   - `FAILED` with retries exhausted → should have become `FAILED_WITH_TERMINAL_ERROR` and failed
     the whole workflow already; if the workflow still shows `RUNNING`, check whether
     `progressWorkflow()` actually ran after the failure (it's invoked synchronously inside
     `failTask`, so this would indicate a deeper bug, not routine operational drift).
2. **Check the queue directly.** For a Redis-backed deployment, `LLEN pulsar:queue:<taskReferenceName>`
   tells you how many items are waiting, and `ZRANGE pulsar:lease:<taskReferenceName> 0 -1 WITHSCORES`
   shows in-flight leases and their expiry timestamps.
3. **Check `task_executions` directly** if you have database access:
   ```sql
   SELECT task_reference_name, task_type, status, retry_count, worker_id, start_time, end_time
   FROM task_executions
   WHERE workflow_execution_id = '<uuid>'
   ORDER BY scheduled_time;
   ```
4. **Recovery options**: `POST /workflows/{id}/retry` reschedules any `FAILED`/`TIMED_OUT` tasks in
   place (and flips the workflow back to `RUNNING` if it had failed); `POST
   /workflows/{id}/rerun` starts an entirely fresh execution with the same input if you'd rather
   not resume the stuck one. `PUT /workflows/{id}/terminate` ends it definitively.

## Rotating the JWT signing secret

`PULSAR_JWT_SECRET` (default in `application.yml` is an explicitly-labeled
`dev-only-signing-secret-do-not-use-in-production...` placeholder) is used as an HMAC key by
`JwtService` to sign and verify every access/refresh token. **Rotating it invalidates every
outstanding token immediately** — every logged-in operator will need to log in again; there is no
dual-key grace-period mechanism in this build. Procedure:

1. Generate a new secret (32+ random bytes, e.g. `openssl rand -base64 48`).
2. Update the value backing `PULSAR_JWT_SECRET` in whatever secret store production reads from
   (see [`security.md`](security.md) for the recommended AWS Secrets Manager / K8s Secret pattern
   — `k8s/base/secret.yaml`'s `PULSAR_JWT_SECRET` placeholder is what this maps to).
3. Roll `pulsar-server` pods (a `kubectl rollout restart deployment/pulsar-server-deployment` or
   equivalent) so every replica picks up the new secret — mid-rotation, some replicas signing with
   the old secret and others with the new would mean tokens issued by one replica fail
   verification against another, so plan for a short window of `401`s across a rolling restart
   unless done during low traffic.
4. Communicate to operators that they'll need to log in again.

## Rotating worker API keys

Two tiers exist (`ApiKeyValidator`):

- **Static dev key** (`PULSAR_WORKER_API_KEY`, default `pk_dev_local_key_change_me`) — a single
  shared secret compared directly. Rotating this means updating the env var everywhere it's
  configured (server + every worker deployment) simultaneously, since there's no overlap window.
- **Database-backed keys** (`api_keys` table, `key_hash` is SHA-256 of the raw key, `active`
  flag) — these can be minted and revoked independently without touching the static dev key or
  restarting the server. There is currently no REST endpoint to mint/revoke these through the API
  (no `ApiKeyController` exists yet) — this is a direct-database operation today:
  ```sql
  -- mint (compute the SHA-256 hex of the raw key client-side first)
  INSERT INTO api_keys (id, key_hash, name, active, created_at)
  VALUES (gen_random_uuid(), '<sha256-hex>', 'worker-fleet-2', true, now());

  -- revoke
  UPDATE api_keys SET active = false WHERE name = 'worker-fleet-2';
  ```
  Revoking a key takes effect on the next request — `ApiKeyValidator.isValid` checks
  `active = true` on every call, there's no caching layer to invalidate.

For production, treat the static dev key as something to **remove reliance on entirely** in favor
of per-fleet database-backed keys — see [`security.md`](security.md).

## Backup considerations for PostgreSQL

- **RDS automated backups**: the Terraform `database` module sets
  `backup_retention_period = var.pulsar_db_backup_retention_days` and `multi_az = true` in
  production (`db.r6g.large`) — confirm the retention variable is actually set to a
  business-appropriate value in `terraform.tfvars` for the environment (it has no hardcoded
  default in the module itself, so check `terraform/environments/production/variables.tf` and
  whatever `.tfvars` supplies it at apply time).
- **Final snapshot on teardown**: `skip_final_snapshot = false` and
  `final_snapshot_identifier` are set, and `deletion_protection` is enabled specifically when
  `pulsar_environment == "production"` — so an accidental `terraform destroy` against production
  can't silently drop the database without a snapshot and requires explicitly disabling deletion
  protection first.
- **Flyway migrations are forward-only.** There's no automated down-migration tooling. Before
  applying a schema-changing release, take a manual snapshot (beyond the automated ones) if the
  migration is anything more than additive, and test the migration against a restored snapshot in
  a non-production environment first.
- **What's not backed up automatically**: Redis. It's used purely as a task queue + lease store —
  everything in `task_executions`/`workflow_executions` (the durable source of truth) lives in
  Postgres, so a Redis data loss event (e.g. ElastiCache failover clearing in-flight leases) is
  recoverable via `TaskTimeoutSweeper` re-detecting expired-looking `IN_PROGRESS` tasks from
  Postgres and re-queuing them — Redis itself needs no backup/restore strategy for this reason.

## Related documents

- [`security.md`](security.md) — full threat model and secrets management recommendations
- [`monitoring.md`](monitoring.md) — metrics to watch while operating the system
- [`troubleshooting.md`](troubleshooting.md) — symptom-to-fix reference
