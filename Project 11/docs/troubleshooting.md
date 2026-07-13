# Troubleshooting

Symptom-to-fix reference for the issues most likely to actually come up, based on this codebase's
specific design choices (not a generic Spring Boot troubleshooting list).

## Auth returns 401

| Symptom | Likely cause | Fix |
|---|---|---|
| `POST /auth/login` returns 401 | Wrong username/password, or the bootstrap admin row was never seeded | Confirm `V2__seed_bootstrap_data.sql` ran (check `SELECT * FROM users;`); default is `admin` / `PulsarAdmin123!` |
| Any request with a bearer token returns 401 | Token expired (`PULSAR-2004`/`TOKEN_EXPIRED`), or signed with a different `PULSAR_JWT_SECRET` than the server currently uses | Call `/auth/refresh`, or re-login. If the server's JWT secret was rotated/changed since the token was issued, every existing token is permanently invalid — see [`operations-guide.md`](operations-guide.md#rotating-the-jwt-signing-secret) |
| A `GET` under `/api/pulsar/v1` returns 401 unexpectedly, even with a valid token | Check `SecurityConfig`'s ordering — `VIEWER`/`OPERATOR`/`ADMIN`/`WORKER` all satisfy the `GET` rule, so a 401 here usually means the `Authorization` header wasn't sent or is malformed (missing `Bearer ` prefix), not a role problem | Verify the header literally reads `Authorization: Bearer <token>` |
| Worker calls to `/tasks/**` return 401 | `X-Pulsar-Api-Key` header missing, wrong value, or (for DB-backed keys) the key's `active` flag is `false` | Confirm the header name is exact (`X-Pulsar-Api-Key`, case-sensitive per Spring's header matching being case-insensitive but the client must send *some* casing consistently) and the value matches either `PULSAR_WORKER_API_KEY` or an active row in `api_keys` |
| Worker calls to `/tasks/**` return 403 instead of 401 | Rare — would indicate the API key filter granted a role that `SecurityConfig`'s path rule doesn't accept; `/tasks/**` accepts `WORKER`/`OPERATOR`/`ADMIN`, so a 403 here suggests some other authentication (e.g. an expired-but-still-attached JWT for a `VIEWER`) took precedence | Remove any stray `Authorization` header and rely solely on `X-Pulsar-Api-Key` for worker calls |

## Workflow stuck in RUNNING

See the full diagnostic walkthrough in
[`operations-guide.md`](operations-guide.md#inspecting-stuck-workflows). Quick triage:

1. Look at the last task's status via `GET /workflows/{id}`.
2. `SCHEDULED` and not moving → no worker is polling that `taskReferenceName`. Remember: the queue
   topic is the DAG node's `taskReferenceName`, not the `TaskDefinition.name` — a worker whose
   `getTaskType()` returns the wrong string will never see the task. The bundled demo workers
   return the correct `taskReferenceName`-based topic already; check this first if you've added a
   custom `TaskWorker` and its tasks aren't being picked up.
3. `IN_PROGRESS` past its lease → wait for `TaskTimeoutSweeper`'s next run (default every 30s) to
   reclaim it, or check the server logs for a `"lease expired, reclaiming as failure"` warning
   confirming it did.

## Testcontainers / Docker connectivity issues

`WorkflowEndToEndTest` (and any test extending `AbstractIntegrationTest`) needs a Docker daemon
reachable from the JVM running the test — Testcontainers pulls `postgres:16-alpine` and
`redis:7-alpine` images and starts real containers per test run.

This exact class of failure was hit in this project's own build sandbox: the local environment
had a Docker/JVM connectivity quirk that prevented `mvn verify` from completing the
`pulsar-server` integration test, even though `pulsar-core` and `pulsar-worker-sdk`'s
non-containerized tests ran fine. This was **not resolved by changing test code** — it's an
environment issue, not a bug in the test. GitHub Actions' hosted runners (used by
`pulsar-ci.yml`'s `java-build-test` job) have a working Docker daemon and do run this test as part
of `mvn verify`. If you hit this locally:

1. Confirm Docker itself is running: `docker ps` should succeed without error.
2. Confirm Testcontainers can see it: `docker run --rm hello-world`.
3. On macOS with Docker Desktop, confirm `DOCKER_HOST` isn't pointed at a stale socket from a
   previous Docker context switch (`docker context ls`, `docker context use default` if needed).
4. On Colima/Podman/other non-Docker-Desktop setups, Testcontainers may need
   `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` or `DOCKER_HOST` set explicitly to the actual socket
   path.
5. As a last resort for local iteration, run everything except the `integration`-tagged test
   (`mvn -pl pulsar-server test` runs the `test` phase only, which by default doesn't include
   Failsafe-style integration tests if they're wired to run under `verify` — check the actual
   Maven Surefire/Failsafe configuration if this distinction matters for your setup) and trust
   CI's result for the Testcontainers-dependent path.

## Flyway migration failures

| Symptom | Cause | Fix |
|---|---|---|
| `FlywayException: Validate failed` on server startup | The Postgres database already has a `flyway_schema_history` table from a prior, different schema version (e.g. you previously ran against this same volume with an older/different build) | `docker compose down -v` to drop the named volume and start clean, or manually `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` against a database you're sure you can wipe |
| `relation "workflow_definitions" already exists` | Schema was created by hand (e.g. `hibernate.ddl-auto` was briefly set to something other than `validate`) outside of Flyway's tracking | Never run with `ddl-auto` other than `validate` against a Flyway-managed database; reset the schema and let Flyway be the sole schema owner |
| Migration hangs indefinitely | Usually not Flyway itself — check that Postgres is actually reachable at `PULSAR_DB_URL` and not still starting up (Compose's `depends_on: condition: service_healthy` should prevent this, but a manual `mvn spring-boot:run` without Compose's healthcheck gating can race a slow-starting Postgres) | Confirm `pg_isready -U pulsar -d pulsar` succeeds before starting the server manually |

## Port conflicts

| Port | Used by | If already taken |
|---|---|---|
| `8080` | `pulsar-server` | Another local Spring Boot app, or a previous `docker compose up` still running. `lsof -i :8080` to find it, or override `PULSAR_SERVER_PORT` |
| `5432` | Postgres | A system-wide Postgres install. Stop it, or remap the Compose port mapping (left side of `"8080:8080"`-style entries in `docker-compose.yml`) |
| `6379` | Redis | Same as above for a local Redis |
| `5173` | `pulsar-ui` (Vite dev server, or the Compose nginx mapping) | Another Vite project. Vite auto-increments to `5174` etc. in dev mode if the port's taken; the Compose mapping would need manual remapping |

## UI shows "Pulsar has no workflow execution with id ..."

This is the UI correctly handling a `404`/`PULSAR-1003` from `GET /workflows/{id}` — either the
UUID was mistyped/copied wrong, or you're pointed at a different environment's database than the
one that actually ran that execution (check `VITE_API_BASE_URL` matches the server you expect).

## "No workflow definition named X is registered"

`404`/`PULSAR-1001` — either the definition was never registered (run `DemoWorkerLauncher`'s
`SeedDataLoader`, or register it manually), or you're querying the wrong server/environment. Since
there's no list-all-names endpoint, double-check spelling against the four known seed names:
`video-ingest-pipeline`, `content-moderation-review`, `regional-licensing-check`,
`cdn-refresh-pipeline`.
