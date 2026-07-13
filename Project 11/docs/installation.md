# Installation & Local Setup

Two supported paths: Docker Compose (fastest, fewest moving parts to reason about) and a manual/IDE
path (best for actually developing against the codebase). Both assume the prerequisites below.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Java | 21 (Temurin recommended) | `maven.compiler.release` in the parent POM targets 21 language features. |
| Maven | 3.9+ | Multi-module reactor build (`pulsar-common`, `pulsar-core`, `pulsar-server`, `pulsar-worker-sdk`). |
| Node.js | 20+ | Matches `node:20-alpine` used in `pulsar-ui/Dockerfile` and the CI `ui-build` job. |
| npm | bundled with Node 20 | Frontend package manager. |
| Docker + Docker Compose | recent | Runs Postgres 16, Redis 7, and (optionally) the whole stack. |

## Path 1 — Docker Compose (fastest)

```bash
git clone <this-repo>
cd "Project 11"
docker compose up --build
```

This starts, on the `pulsar-network` bridge network:

- `postgres` (`postgres:16-alpine`, healthcheck via `pg_isready`)
- `redis` (`redis:7-alpine`, healthcheck via `redis-cli ping`)
- `pulsar-server` (built from `docker/server/Dockerfile`, port `8080`, waits on both healthchecks)
- `pulsar-worker-demo` (built from `docker/worker/Dockerfile`, waits on `pulsar-server`'s
  healthcheck, then seeds the 12 task definitions + 4 workflows and starts polling)
- `pulsar-ui` (nginx serving the Vite build, port `5173` → container port `80`)

Once it's up: UI at `http://localhost:5173`, API at `http://localhost:8080`, Swagger UI at
`http://localhost:8080/swagger-ui.html`.

> **Honesty note on verification**: this Compose file's syntax was checked with
> `docker compose config` during this project's build, but a full `docker compose up` run —
> including Flyway actually migrating a fresh Postgres volume and the demo worker fleet
> successfully seeding and polling against a live server — was not executed end-to-end in that
> build session. Treat the steps above as the intended path, not a guaranteed-working transcript.
> Do a manual smoke test (log in, start `video-ingest-pipeline`, watch it progress in the UI)
> before depending on this stack. See [Troubleshooting](troubleshooting.md) for issues to expect
> on a genuinely first run.

To stop and remove containers (keeping the named Postgres volume):

```bash
docker compose down
```

To also wipe the database volume (forces Flyway to re-run from scratch next time):

```bash
docker compose down -v
```

## Path 2 — Manual / IDE

Useful when actively developing: faster feedback loop, real debugger attach, no image rebuilds.

### 1. Build all modules

```bash
mvn -pl pulsar-common,pulsar-core,pulsar-server,pulsar-worker-sdk -am clean install
```

`-am` ("also make") builds dependency modules in the right order even though you're only listing
the leaf modules with `-pl`.

### 2. Start just the datastores

```bash
docker compose up postgres redis
```

### 3. Run the server

```bash
mvn -pl pulsar-server spring-boot:run
```

On boot, Flyway applies `V1__init_schema.sql` then `V2__seed_bootstrap_data.sql` against
`jdbc:postgresql://localhost:5432/pulsar` (the default profile's connection string —
`application.yml`, not `application-docker.yml`). This creates the schema and seeds the bootstrap
`admin` user plus two smoke-test task definitions (`noop-task`, `sample-task`).

Key environment variables (all optional, all have working defaults for local use — see
`pulsar-server/src/main/resources/application.yml`):

| Variable | Default | Purpose |
|---|---|---|
| `PULSAR_SERVER_PORT` | `8080` | HTTP port |
| `PULSAR_DB_URL` | `jdbc:postgresql://localhost:5432/pulsar` | JDBC URL |
| `PULSAR_DB_USERNAME` / `PULSAR_DB_PASSWORD` | `pulsar` / `pulsar` | DB credentials |
| `PULSAR_REDIS_HOST` / `PULSAR_REDIS_PORT` | `localhost` / `6379` | Redis connection |
| `PULSAR_SWEEPER_INTERVAL_MS` | `30000` | `TaskTimeoutSweeper` poll interval |
| `PULSAR_DEFAULT_LEASE_SECONDS` | `60` | Task poll lease duration |
| `PULSAR_WORKER_API_KEY` | `pk_dev_local_key_change_me` | Static dev worker API key |
| `PULSAR_JWT_SECRET` | `dev-only-signing-secret-do-not-use-in-production-min-32-bytes` | JWT HMAC signing key |
| `PULSAR_JWT_ACCESS_TTL_MINUTES` | `60` | Access token lifetime |
| `PULSAR_JWT_REFRESH_TTL_DAYS` | `30` | Refresh token lifetime |

### 4. Run the demo worker fleet

In a second terminal:

```bash
mvn -pl pulsar-worker-sdk exec:java -Dexec.mainClass=media.reelforge.pulsar.workersdk.demo.DemoWorkerLauncher
```

Relevant env vars: `PULSAR_API_BASE_URL` (default `http://localhost:8080`),
`PULSAR_WORKER_API_KEY` (must match the server's), `PULSAR_WORKER_ID` (default
`demo-worker-<random>`). This registers all 12 task definitions and 4 seed workflows (skipping any
already registered at that version) and starts 12 polling loops, one per demo `TaskWorker`.

> See [Known Limitations](../README.md#known-limitations) in the root README: the demo workers
> poll by `TaskDefinition.name` (e.g. `transcode-video`) while the seeded workflows' DAG nodes
> queue under `taskReferenceName` (e.g. `transcode_video_ref`) — as shipped, these don't line up,
> so don't be surprised if the demo fleet appears to sit idle against the seeded workflows.

### 5. Run the UI

In a third terminal:

```bash
cd pulsar-ui
npm install
npm run dev
```

Vite serves on `http://localhost:5173` by default and reads `VITE_API_BASE_URL` (defaults to
`http://localhost:8080` per `pulsar-ui/src/api/client.ts`) to know where the API lives.

Log in with `admin` / `PulsarAdmin123!`.

## Running tests

```bash
# Everything except Testcontainers-tagged integration tests still runs without Docker access
mvn -pl pulsar-common,pulsar-core,pulsar-server,pulsar-worker-sdk -am test

# Full verify (includes the @Tag("integration") Testcontainers test in pulsar-server)
mvn -pl pulsar-common,pulsar-core,pulsar-server,pulsar-worker-sdk -am verify
```

`pulsar-core` and `pulsar-worker-sdk`'s tests need nothing but the JVM. `pulsar-server`'s
`WorkflowEndToEndTest` (tagged `integration`, extends `AbstractIntegrationTest`) spins up real
Postgres and Redis containers via Testcontainers — it needs a reachable Docker daemon. See
[Troubleshooting](troubleshooting.md) if that test fails to start containers locally.

## First-run troubleshooting quick reference

Full detail in [`troubleshooting.md`](troubleshooting.md); the two most common first-run snags:

- **Port already in use** (`8080`, `5432`, `6379`, or `5173`) — another local Postgres/Redis
  instance or a previous Compose run still holding the port. Stop the conflicting process or
  change the mapped host port in `docker-compose.yml`.
- **Flyway migration failure on a non-empty Postgres volume** — if you previously ran a different
  schema against the same named volume (`pulsar-postgres-data`), Flyway will refuse to apply
  migrations against a database it doesn't recognize the history of. `docker compose down -v` to
  reset the volume, or point at a fresh database.
