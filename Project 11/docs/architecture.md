# Architecture

This document goes one level deeper than the README's system diagram: the component breakdown,
the request/decision lifecycle of a single workflow execution, and the hexagonal port/adapter
relationship between `pulsar-core` and `pulsar-server`.

## Component diagram

```mermaid
flowchart TB
    subgraph Clients
        UI["pulsar-ui<br/>(React SPA, nginx)"]
        SDK["pulsar-worker-sdk<br/>PulsarApiClient + PulsarWorkerRunner<br/>12 demo TaskWorkers"]
    end

    subgraph "pulsar-server (Spring Boot process)"
        direction TB
        Ctrl["Controllers<br/>Auth / WorkflowDefinition / Workflow / TaskDefinition / Task / Webhook"]
        Sec["Security filters<br/>JwtAuthenticationFilter, ApiKeyAuthenticationFilter<br/>-> SecurityConfig path-based RBAC"]
        Svc["Services<br/>WorkflowDefinitionService, WorkflowExecutionService,<br/>TaskDefinitionService, TaskExecutionService, AuthService"]
        Adapters["Persistence adapters<br/>Jpa*Repository implements pulsar-core repository ports"]
        RedisAdapter["RedisTaskQueue<br/>implements pulsar-core TaskQueue port"]
        Sweeper["TaskTimeoutSweeper<br/>@Scheduled, every 30s default"]
    end

    subgraph "pulsar-core (plain Java library, no Spring)"
        Engine["DecisionEngine"]
        FSM["WorkflowStateMachine"]
        Validator["WorkflowGraphValidator"]
        Ports["Ports: WorkflowDefinitionRepository,<br/>WorkflowExecutionRepository, TaskExecutionRepository,<br/>TaskDefinitionRepository, TaskQueue, SubWorkflowStarter"]
    end

    DB[("PostgreSQL 16")]
    Q[("Redis 7")]

    UI -->|"JWT bearer"| Ctrl
    SDK -->|"X-Pulsar-Api-Key"| Ctrl
    Ctrl --> Sec --> Svc
    Svc --> Engine
    Svc --> Validator
    Svc --> FSM
    Svc --> Adapters --> DB
    Svc --> RedisAdapter --> Q
    Sweeper --> Adapters
    Sweeper --> Svc
    Engine -.implements against.-> Ports
    Adapters -.implements.-> Ports
    RedisAdapter -.implements.-> Ports
```

`pulsar-core` defines the ports (`*Repository`, `TaskQueue`, `SubWorkflowStarter`) and the pure
logic that reasons about them (`DecisionEngine`, `WorkflowStateMachine`, `WorkflowGraphValidator`).
It has no knowledge that Postgres, Redis, or Spring exist. `pulsar-server` is the only module that
implements those ports for real infrastructure and the only module with a REST surface.

## Workflow execution sequence

This traces one `SIMPLE`-task step through the whole system: a workflow starts, the engine decides
what's runnable, a task lands on the queue, a worker polls/executes/completes it, and the engine
decides again.

```mermaid
sequenceDiagram
    participant Op as Operator / UI
    participant API as pulsar-server API
    participant Svc as WorkflowExecutionService
    participant Eng as DecisionEngine
    participant DB as PostgreSQL
    participant Q as Redis Queue
    participant W as Worker (pulsar-worker-sdk)

    Op->>API: POST /workflows {workflowName, input}
    API->>Svc: startWorkflow(...)
    Svc->>DB: save WorkflowExecution (status=RUNNING)
    Svc->>Eng: decide(definition, execution, executions=[])
    Eng-->>Svc: schedule [firstTask]
    Svc->>DB: save TaskExecution (status=SCHEDULED)
    Svc->>Q: push(taskReferenceName, taskExecutionId)
    Svc-->>API: workflowExecutionId
    API-->>Op: 201 Created

    loop worker poll loop
        W->>API: GET /tasks/poll/{taskType}?workerId=...
        API->>Q: poll(taskType, leaseTime=60s)
        Q-->>API: taskExecutionId (or empty -> 204)
        API->>DB: mark IN_PROGRESS, set workerId/startTime
        API-->>W: 200 + task input
    end

    W->>W: execute(input) — simulated OTT task work
    W->>API: POST /tasks/{id}/complete {output}
    API->>Svc: completeTask(id, output)
    Svc->>DB: mark COMPLETED, save output
    Svc->>Q: acknowledge(taskType, id)
    Svc->>Svc: progressWorkflow(workflowExecutionId)
    Svc->>Eng: decide(definition, execution, executions)
    Eng-->>Svc: schedule [nextTask] OR terminal(COMPLETED/FAILED)

    alt more tasks to schedule
        Svc->>DB: save next TaskExecution(s)
        Svc->>Q: push next task(s)
    else workflow complete
        Svc->>DB: WorkflowExecution status -> COMPLETED, endTime set
    end
```

Two details worth calling out:

- **The decide/schedule loop is re-entrant, not a single pass.** `progressWorkflow()` (private
  overload in `WorkflowExecutionService`) loops `while (cascade)`: every control-flow task
  (`FORK`/`JOIN`/`DECISION`/`TERMINATE`/`SUB_WORKFLOW`) auto-completes synchronously in the same
  call, which sets `cascade = true` and triggers another `decide()` — because a `JOIN`'s
  successors, or a `DECISION`'s chosen branch, are only knowable *after* that node's own status is
  written. The loop naturally terminates once the only remaining scheduled item is a
  worker-polled `SIMPLE`/`DYNAMIC` task.
- **Failure re-enters the same path.** `TaskExecutionService.failTask` either marks a task
  `FAILED_WITH_TERMINAL_ERROR` (terminal, retries exhausted or explicit) or `FAILED` →
  immediately `SCHEDULED` again with an incremented `retryCount` and a delay computed by the
  task's `RetryPolicy` — then calls `progressWorkflow()` just like `completeTask` does.

## Hexagonal port/adapter relationship

```mermaid
flowchart LR
    subgraph "pulsar-core — hexagon interior"
        Model["Domain model<br/>WorkflowDefinition, TaskDefinitionRef,<br/>WorkflowExecution, TaskExecution"]
        Logic["Domain logic<br/>DecisionEngine, WorkflowStateMachine,<br/>WorkflowGraphValidator, RetryPolicy*"]
        PortsOut["Outbound ports (interfaces)<br/>WorkflowDefinitionRepository<br/>WorkflowExecutionRepository<br/>TaskDefinitionRepository<br/>TaskExecutionRepository<br/>TaskQueue<br/>SubWorkflowStarter"]
    end

    subgraph "pulsar-server — adapters"
        JpaAdapters["persistence/adapter/Jpa*Repository<br/>(implements the repository ports,<br/>delegates to Spring Data JPA repos + mappers)"]
        RedisA["queue/RedisTaskQueue<br/>(implements TaskQueue)"]
        SubWfA["WorkflowExecutionService's<br/>lambda SubWorkflowStarter<br/>(delegates back into startWorkflow)"]
        RestIn["api/v1/controller/*<br/>(inbound adapter: HTTP -> service calls)"]
    end

    RestIn --> Logic
    Logic --> PortsOut
    JpaAdapters -. implements .-> PortsOut
    RedisA -. implements .-> PortsOut
    SubWfA -. implements .-> PortsOut
```

Why this matters in practice: `pulsar-core`'s test suite (`DecisionEngineTest`,
`WorkflowGraphValidatorTest`, `WorkflowStateMachineTest`, `InMemoryTaskQueueTest`,
`RetryPolicyTest`) runs as plain JUnit — no Spring context, no database, no Docker. The engine's
hardest logic (fork/join resolution, decision branching, cycle detection) is verified in
milliseconds. `InMemoryTaskQueue` doubles as both a reference implementation of the `TaskQueue`
port and a fast test double — it isn't test-only scaffolding, it's a real, complete implementation
that happens to be convenient for tests too.

See also: [`developer-guide.md`](developer-guide.md) for how to add a new adapter or extend the
domain model, and the root [`README.md`](../README.md#system-architecture) for the higher-level
system diagram.
