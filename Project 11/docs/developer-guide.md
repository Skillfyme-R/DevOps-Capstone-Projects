# Developer Guide

For engineers extending Pulsar: authoring workflows, implementing workers, understanding the
repository ports, and running the test suite per module.

## Authoring a new workflow definition

Workflow definitions are JSON documents matching `RegisterWorkflowDefinitionRequest` /
`WorkflowDefinition` (see [`api-reference.md`](api-reference.md#workflow-definitions) for the full
field reference and the four seed workflows in
`pulsar-worker-sdk/src/main/resources/seed/workflows/` for worked examples).

Rules enforced by `WorkflowGraphValidator` at registration time (violate these and you get a
`400`/`PULSAR-1005` or `PULSAR-1010`, not a runtime surprise):

1. **At least one task.** An empty `tasks` array is rejected.
2. **Unique `taskReferenceName` per task.** This is the node's identity within the DAG — it's also
   the queue topic a `SIMPLE`/`DYNAMIC` task is polled under, so name it deterministically (the
   seed workflows use a `_ref` suffix convention, e.g. `transcode_video_ref`).
3. **No dangling references.** Every string in `next`, `joinOn`, `decisionCases` values, and
   `defaultCase` must resolve to another task's `taskReferenceName` in the same definition.
4. **Every `FORK` needs a matching `JOIN`.** A `FORK`'s `next` list is its parallel branch starting
   points; some `JOIN` in the definition must declare a `joinOn` that's a superset of those
   branches (usually an exact match).
5. **No cycles.** Checked via DFS over `next` (and, for `DECISION` nodes, also over
   `decisionCases`/`defaultCase`) — a workflow graph must be a DAG.

Task type cheat sheet (full semantics in the root [README](../README.md#domain-model--dag-concepts)):

| Type | Fields you set | Notes |
|---|---|---|
| `SIMPLE` / `DYNAMIC` | `inputParameters`, `next` | Only types dispatched to the task queue. |
| `FORK` | `next` (≥1 branch entry points) | Auto-completes, fans out immediately. |
| `JOIN` | `joinOn` (branch refs to wait for), `next` | Auto-completes once all `joinOn` refs are `COMPLETED`/`SKIPPED`. |
| `DECISION` | `decisionInputParameter`, `decisionCases`, `defaultCase` | `decisionInputParameter` is looked up in `inputParameters` at decide time; unmatched values fall to `defaultCase`. |
| `TERMINATE` | `inputParameters.terminationStatus` (optional, defaults to `COMPLETED`) | Ends the workflow immediately when reached. |
| `SUB_WORKFLOW` | `subWorkflowName`, `subWorkflowVersion` (0 = latest) | Fire-and-forget — starts the child, doesn't wait for it. |

Input parameter values like `"${workflow.input.assetId}"` are stored verbatim as strings in this
build — there is no expression-resolution engine evaluating `${...}` placeholders against runtime
data at decide time (unlike Conductor's real expression language). Treat them as documentation of
intent for now; a worker or a future engine enhancement would need to actually resolve them.

### Registering it

```bash
curl -X POST http://localhost:8080/api/pulsar/v1/workflow-definitions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @my-workflow.json
```

Or programmatically, the way `SeedDataLoader` does it, via `PulsarApiClient.registerWorkflowDefinition(Map)`.

## Implementing a new `TaskWorker`

A worker is any class implementing `media.reelforge.pulsar.workersdk.worker.TaskWorker`:

```java
public interface TaskWorker {
    String getTaskType();
    Map<String, Object> execute(Map<String, Object> input) throws Exception;
}
```

Look at `TranscodeVideoWorker` (`pulsar-worker-sdk/src/main/java/.../demo/workers/`) as a template:

```java
public class MyNewWorker implements TaskWorker {
    @Override
    public String getTaskType() {
        return "my-new-task";   // must match the queue topic it should poll
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        // do the work; throw to signal failure (caught by PulsarWorkerRunner, reported via failTask)
        return Map.of("someOutputKey", "someValue");
    }
}
```

**Important — the queue topic your worker polls must exactly match what the server pushes to.**
`WorkflowExecutionService.queueTopic()` pushes `SIMPLE`/`DYNAMIC` tasks under the DAG node's
`taskReferenceName`, not the reusable `TaskDefinition.name`. The bundled demo workers'
`getTaskType()` methods return the exact `taskReferenceName` string used in the seed workflow JSON
(e.g. `"transcode_video_ref"`, not `"transcode-video"`) for exactly this reason. When writing a new
worker against a workflow you also author, make `getTaskType()` return the exact
`taskReferenceName` string used in that workflow's JSON — not the task definition's `name`.

Register your worker with a `PulsarWorkerRunner`:

```java
PulsarApiClient client = new PulsarApiClient(baseUrl, AuthProvider.apiKey(apiKey));
PulsarWorkerRunner runner = new PulsarWorkerRunner(client, "my-worker-1", Duration.ofSeconds(2),
        List.of(new MyNewWorker()));
runner.start();
```

Each `TaskWorker` gets its own dedicated polling thread (`PulsarWorkerRunner` sizes a
`ScheduledExecutorService` to `workers.size()`), so a slow worker for one task type never starves
polling for another.

### Failure handling in a worker

Throw any `Exception` from `execute()` — `PulsarWorkerRunner.pollAndExecuteOnce` catches it and
calls `apiClient.failTask(taskId, message, terminal=false)`, letting the server-side
`TaskDefinition`'s retry policy decide whether to retry or terminally fail. If you need to force a
non-retryable failure regardless of the registered retry policy, you'd need to extend the SDK — as
shipped, `PulsarWorkerRunner` always reports `terminal=false`.

## How the hexagonal repository ports work

`pulsar-core` defines these outbound ports (interfaces, no Spring annotations):

- `WorkflowDefinitionRepository` — `findByNameAndVersion`, `findLatestByName`, `save`,
  `findAllVersionsByName` (no `findById` — `pulsar-server` deliberately keys `WorkflowExecution`'s
  `workflowDefinitionId` field by the definition's *name*, not a synthetic id, specifically so
  `progressWorkflow(UUID)` can resolve the owning definition without needing an id-based lookup
  method on this port).
- `WorkflowExecutionRepository`, `TaskExecutionRepository`, `TaskDefinitionRepository` — standard
  CRUD-shaped ports over the core domain model types.
- `TaskQueue` — `push`, `poll` (lease-based, SQS-visibility-timeout-style), `acknowledge`,
  `extendLease`, `peek`.
- `SubWorkflowStarter` — a single-method functional interface (`startSubWorkflow`) that
  `pulsar-server` wires as a lambda delegating back into `WorkflowExecutionService.startWorkflow`.

`pulsar-server` provides exactly one adapter per port:

| Port | Adapter | Where |
|---|---|---|
| `WorkflowDefinitionRepository` | `JpaWorkflowDefinitionRepository` | `persistence/adapter/` |
| `WorkflowExecutionRepository` | `JpaWorkflowExecutionRepository` | `persistence/adapter/` |
| `TaskExecutionRepository` | `JpaTaskExecutionRepository` | `persistence/adapter/` |
| `TaskDefinitionRepository` | `JpaTaskDefinitionRepository` | `persistence/adapter/` |
| `TaskQueue` | `RedisTaskQueue` | `queue/` |
| `SubWorkflowStarter` | inline lambda in `WorkflowExecutionService`'s constructor | `service/` |

Each `Jpa*Repository` adapter delegates to a Spring Data JPA repository
(`persistence/repository/*JpaRepository`) over a JPA `@Entity` (`persistence/entity/*Entity`), and
uses a `persistence/mapper/*Mapper` to convert between the entity and the `pulsar-core` domain
record/class. If you need a new persistence-backed capability, the pattern is: add the method to
the `pulsar-core` port interface first, then implement it in the matching adapter — never let JPA
types leak back into `pulsar-core`.

If you wanted to swap Redis for something else (e.g. SQS) as the task queue, you'd write a new
`TaskQueue` implementation in `pulsar-server` and wire it in as the `@Component`/`@Bean` — nothing
in `pulsar-core` or the controllers would need to change, since they only depend on the `TaskQueue`
interface.

## Running tests per module

```bash
# Fast, no Docker required — pulsar-core's engine/state-machine/validator/retry/queue unit tests
mvn -pl pulsar-core test

# Worker SDK — HTTP client tests against a JDK HttpServer stub, plus demo worker unit tests
mvn -pl pulsar-worker-sdk -am test

# Server — includes @Tag("integration") Testcontainers tests; needs Docker
mvn -pl pulsar-server -am verify

# Everything
mvn -pl pulsar-common,pulsar-core,pulsar-server,pulsar-worker-sdk -am verify
```

Notable test files, by what they cover:

- `pulsar-core/.../engine/DecisionEngineTest.java` — fork/join/decision/terminate scheduling logic.
- `pulsar-core/.../engine/WorkflowGraphValidatorTest.java` — dangling refs, unmatched fork/join,
  cycle detection.
- `pulsar-core/.../engine/WorkflowStateMachineTest.java` — legal/illegal status transitions.
- `pulsar-core/.../queue/InMemoryTaskQueueTest.java` — lease/reclaim semantics of the reference
  `TaskQueue` implementation.
- `pulsar-core/.../retry/RetryPolicyTest.java` — fixed/linear/exponential delay math.
- `pulsar-server/.../integration/WorkflowEndToEndTest.java` — the most important test in the repo:
  a real two-step workflow driven through the actual REST API against Testcontainers-backed
  Postgres + Redis, asserting the workflow reaches `COMPLETED`. Tagged `integration`; needs a
  reachable Docker daemon — see [`troubleshooting.md`](troubleshooting.md).
- `pulsar-server/.../api/WorkflowControllerSecurityTest.java` — RBAC/auth enforcement at the
  controller layer.
- `pulsar-server/.../api/WorkflowDefinitionValidationTest.java` — request-level validation.
- `pulsar-server/.../service/TaskExecutionServiceRetryTest.java` — retry-vs-terminal-fail branching.
- `pulsar-worker-sdk/.../client/PulsarApiClientTest.java` — HTTP client behavior against a JDK
  `HttpServer` stub (no real server needed).
- `pulsar-worker-sdk/.../demo/SeedWorkflowDagSanityTest.java` — parameterized well-formedness
  check of all four seed workflow JSON files via `WorkflowGraphValidator`, in-process.

15 test files exist across the codebase (`find . -path '*/src/test/*' -name '*.java' | xargs
grep -l "@Test" | wc -l`), spanning `pulsar-core`, `pulsar-server`, and `pulsar-worker-sdk`.
