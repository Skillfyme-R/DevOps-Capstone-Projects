package media.reelforge.pulsar.core.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;

class DecisionEngineTest {

    private final DecisionEngine engine = new DecisionEngine();

    private WorkflowDefinition definitionOf(List<TaskDefinitionRef> tasks) {
        return new WorkflowDefinition("wf-1", "ingest-and-transcode", 1, "desc", tasks, 3600,
                "owner@reelforge.media", Instant.now());
    }

    private TaskDefinitionRef simple(String ref, List<String> next) {
        return new TaskDefinitionRef(ref, TaskType.SIMPLE, ref + "-task", Map.of(), next, List.of(), null, Map.of(), List.of(), null, 0);
    }

    private TaskDefinitionRef fork(String ref, List<String> branches) {
        return new TaskDefinitionRef(ref, TaskType.FORK, "fork", Map.of(), branches, List.of(), null, Map.of(), List.of(), null, 0);
    }

    private TaskDefinitionRef join(String ref, List<String> joinOn, List<String> next) {
        return new TaskDefinitionRef(ref, TaskType.JOIN, "join", Map.of(), next, joinOn, null, Map.of(), List.of(), null, 0);
    }

    private TaskDefinitionRef decision(String ref, String inputParam, Object paramValue,
                                        Map<String, List<String>> cases, List<String> defaultCase) {
        Map<String, Object> inputParameters = new java.util.HashMap<>();
        inputParameters.put(inputParam, paramValue);
        return new TaskDefinitionRef(ref, TaskType.DECISION, "decision", inputParameters, List.of(), List.of(),
                inputParam, cases, defaultCase, null, 0);
    }

    private TaskDefinitionRef terminate(String ref, WorkflowStatus status) {
        Map<String, Object> input = status == null ? Map.of() : Map.of("terminationStatus", status.name());
        return new TaskDefinitionRef(ref, TaskType.TERMINATE, "terminate", input, List.of(), List.of(), null, Map.of(), List.of(), null, 0);
    }

    private WorkflowExecution newExecution() {
        return WorkflowExecution.builder()
                .id(UUID.randomUUID())
                .workflowDefinitionId("wf-1")
                .workflowDefinitionVersion(1)
                .status(WorkflowStatus.RUNNING)
                .input(Map.of())
                .build();
    }

    private TaskExecution completed(UUID workflowExecutionId, String ref, TaskType type) {
        return TaskExecution.builder()
                .id(UUID.randomUUID())
                .workflowExecutionId(workflowExecutionId)
                .taskReferenceName(ref)
                .taskType(type)
                .status(TaskExecutionStatus.COMPLETED)
                .build();
    }

    private TaskExecution withStatus(UUID workflowExecutionId, String ref, TaskType type, TaskExecutionStatus status) {
        return TaskExecution.builder()
                .id(UUID.randomUUID())
                .workflowExecutionId(workflowExecutionId)
                .taskReferenceName(ref)
                .taskType(type)
                .status(status)
                .build();
    }

    // ---- Linear sequence ----

    @Test
    void firstDecisionOnFreshWorkflowSchedulesOnlyTheFirstTask() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of("c")),
                simple("c", List.of())
        ));
        WorkflowExecution execution = newExecution();

        DecisionResult result = engine.decide(definition, execution, List.of());

        assertThat(result.isTerminal()).isFalse();
        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName).containsExactly("a");
    }

    @Test
    void completingTaskAAdvancesToTaskB() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of("c")),
                simple("c", List.of())
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(completed(execution.getId(), "a", TaskType.SIMPLE));

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName).containsExactly("b");
    }

    @Test
    void allTasksCompletedYieldsWorkflowCompleted() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of())
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                completed(execution.getId(), "a", TaskType.SIMPLE),
                completed(execution.getId(), "b", TaskType.SIMPLE)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isTrue();
        assertThat(result.terminalStatus()).isEqualTo(WorkflowStatus.COMPLETED);
    }

    // ---- Failure propagation ----

    @Test
    void taskFailedWithTerminalErrorFailsWorkflowImmediately() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of())
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                withStatus(execution.getId(), "a", TaskType.SIMPLE, TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isTrue();
        assertThat(result.terminalStatus()).isEqualTo(WorkflowStatus.FAILED);
    }

    @Test
    void taskFailedAfterExhaustingRetriesFailsWorkflow() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of())
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                withStatus(execution.getId(), "a", TaskType.SIMPLE, TaskExecutionStatus.FAILED)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isTrue();
        assertThat(result.terminalStatus()).isEqualTo(WorkflowStatus.FAILED);
    }

    // ---- Fork / Join ----

    @Test
    void forkSchedulesAllParallelBranchesImmediately() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of("join1")),
                simple("branchB", List.of("join1")),
                join("join1", List.of("branchA", "branchB"), List.of())
        ));
        WorkflowExecution execution = newExecution();

        DecisionResult result = engine.decide(definition, execution, List.of());

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactlyInAnyOrder("fork1", "branchA", "branchB");
    }

    @Test
    void joinDoesNotProceedUntilAllBranchesComplete() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of("join1")),
                simple("branchB", List.of("join1")),
                join("join1", List.of("branchA", "branchB"), List.of("after-join"))
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = new ArrayList<>();
        executions.add(completed(execution.getId(), "fork1", TaskType.FORK));
        executions.add(completed(execution.getId(), "branchA", TaskType.SIMPLE));
        // branchB still in progress

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isFalse();
        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName).doesNotContain("join1");
    }

    @Test
    void joinProceedsOnceAllBranchesComplete() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of("join1")),
                simple("branchB", List.of("join1")),
                join("join1", List.of("branchA", "branchB"), List.of("after-join")),
                simple("after-join", List.of())
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                completed(execution.getId(), "fork1", TaskType.FORK),
                completed(execution.getId(), "branchA", TaskType.SIMPLE),
                completed(execution.getId(), "branchB", TaskType.SIMPLE)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName).contains("join1");
    }

    @Test
    void joinBecomesReadyOnlyAfterLastBranchReportsCompletion() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of("join1")),
                simple("branchB", List.of("join1")),
                join("join1", List.of("branchA", "branchB"), List.of("after-join")),
                simple("after-join", List.of())
        ));
        WorkflowExecution execution = newExecution();

        // Simulate branchB's completion triggering the decide() call, with branchA already completed earlier.
        List<TaskExecution> executions = List.of(
                completed(execution.getId(), "fork1", TaskType.FORK),
                completed(execution.getId(), "branchA", TaskType.SIMPLE),
                completed(execution.getId(), "branchB", TaskType.SIMPLE)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactly("join1");
    }

    // ---- Decision / switch branching ----

    @Test
    void decisionSchedulesMatchingCaseBranch() {
        WorkflowDefinition definition = definitionOf(List.of(
                decision("decide", "region", "us", Map.of(
                        "us", List.of("us-task"),
                        "eu", List.of("eu-task")
                ), List.of("default-task")),
                simple("us-task", List.of()),
                simple("eu-task", List.of()),
                simple("default-task", List.of())
        ));
        WorkflowExecution execution = newExecution();

        DecisionResult result = engine.decide(definition, execution, List.of());

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactlyInAnyOrder("decide", "us-task");
    }

    @Test
    void decisionSkipsUnmatchedBranches() {
        WorkflowDefinition definition = definitionOf(List.of(
                decision("decide", "region", "us", Map.of(
                        "us", List.of("us-task"),
                        "eu", List.of("eu-task")
                ), List.of("default-task")),
                simple("us-task", List.of()),
                simple("eu-task", List.of()),
                simple("default-task", List.of())
        ));
        WorkflowExecution execution = newExecution();

        DecisionResult result = engine.decide(definition, execution, List.of());

        assertThat(result.tasksToSkip()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactlyInAnyOrder("eu-task", "default-task");
    }

    @Test
    void decisionFallsBackToDefaultCaseWhenNoMatch() {
        WorkflowDefinition definition = definitionOf(List.of(
                decision("decide", "region", "apac", Map.of(
                        "us", List.of("us-task"),
                        "eu", List.of("eu-task")
                ), List.of("default-task")),
                simple("us-task", List.of()),
                simple("eu-task", List.of()),
                simple("default-task", List.of())
        ));
        WorkflowExecution execution = newExecution();

        DecisionResult result = engine.decide(definition, execution, List.of());

        assertThat(result.tasksToSchedule()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactlyInAnyOrder("decide", "default-task");
        assertThat(result.tasksToSkip()).extracting(TaskDefinitionRef::taskReferenceName)
                .containsExactlyInAnyOrder("us-task", "eu-task");
    }

    // ---- Terminate task ----

    @Test
    void terminateTaskCompletesWorkflowWithDefaultStatus() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("done")),
                terminate("done", null)
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                completed(execution.getId(), "a", TaskType.SIMPLE),
                completed(execution.getId(), "done", TaskType.TERMINATE)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isTrue();
        assertThat(result.terminalStatus()).isEqualTo(WorkflowStatus.COMPLETED);
    }

    @Test
    void terminateTaskHonorsExplicitTerminationStatus() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("done")),
                terminate("done", WorkflowStatus.FAILED)
        ));
        WorkflowExecution execution = newExecution();
        List<TaskExecution> executions = List.of(
                completed(execution.getId(), "a", TaskType.SIMPLE),
                completed(execution.getId(), "done", TaskType.TERMINATE)
        );

        DecisionResult result = engine.decide(definition, execution, executions);

        assertThat(result.isTerminal()).isTrue();
        assertThat(result.terminalStatus()).isEqualTo(WorkflowStatus.FAILED);
    }
}
