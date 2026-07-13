package media.reelforge.pulsar.server.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

import media.reelforge.pulsar.core.model.RetryLogic;
import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.queue.InMemoryTaskQueue;
import media.reelforge.pulsar.core.repository.TaskDefinitionRepository;
import media.reelforge.pulsar.core.repository.TaskExecutionRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

/** Unit tests for the trickier failTask() decision: retry-vs-terminal-fail based on TaskDefinition.retryCount. */
class TaskExecutionServiceRetryTest {

    private TaskExecutionService service;
    private InMemoryTaskExecutionRepository taskExecutionRepository;
    private InMemoryTaskDefinitionRepository taskDefinitionRepository;
    private InMemoryTaskQueue taskQueue;
    private WorkflowExecutionService workflowExecutionService;

    @BeforeEach
    void setUp() {
        taskExecutionRepository = new InMemoryTaskExecutionRepository();
        taskDefinitionRepository = new InMemoryTaskDefinitionRepository();
        taskQueue = new InMemoryTaskQueue();
        workflowExecutionService = mock(WorkflowExecutionService.class);
        service = new TaskExecutionService(taskExecutionRepository, taskDefinitionRepository, taskQueue,
                workflowExecutionService, new SimpleMeterRegistry());
    }

    @Test
    void retriesWhenAttemptsRemain() {
        taskDefinitionRepository.save(new TaskDefinition(null, "flaky-task", "desc", 3, RetryLogic.FIXED, 1, 60, List.of(), List.of()));
        TaskExecution task = TaskExecution.builder()
                .workflowExecutionId(UUID.randomUUID())
                .taskReferenceName("flaky-task")
                .taskType(TaskType.SIMPLE)
                .status(TaskExecutionStatus.IN_PROGRESS)
                .retryCount(0)
                .build();
        taskExecutionRepository.save(task);

        service.failTask(task.getId(), "transient failure", false);

        TaskExecution reloaded = taskExecutionRepository.findById(task.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(TaskExecutionStatus.SCHEDULED);
        assertThat(reloaded.getRetryCount()).isEqualTo(1);
        verify(workflowExecutionService, times(0)).progressWorkflow(task.getWorkflowExecutionId());
    }

    @Test
    void goesTerminalWhenRetriesExhausted() {
        taskDefinitionRepository.save(new TaskDefinition(null, "flaky-task-2", "desc", 1, RetryLogic.FIXED, 1, 60, List.of(), List.of()));
        TaskExecution task = TaskExecution.builder()
                .workflowExecutionId(UUID.randomUUID())
                .taskReferenceName("flaky-task-2")
                .taskType(TaskType.SIMPLE)
                .status(TaskExecutionStatus.IN_PROGRESS)
                .retryCount(1)
                .build();
        taskExecutionRepository.save(task);

        service.failTask(task.getId(), "still failing", false);

        TaskExecution reloaded = taskExecutionRepository.findById(task.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR);
        verify(workflowExecutionService, times(1)).progressWorkflow(task.getWorkflowExecutionId());
    }

    @Test
    void terminalFlagForcesImmediateTerminalFailureRegardlessOfRetriesRemaining() {
        taskDefinitionRepository.save(new TaskDefinition(null, "flaky-task-3", "desc", 5, RetryLogic.FIXED, 1, 60, List.of(), List.of()));
        TaskExecution task = TaskExecution.builder()
                .workflowExecutionId(UUID.randomUUID())
                .taskReferenceName("flaky-task-3")
                .taskType(TaskType.SIMPLE)
                .status(TaskExecutionStatus.IN_PROGRESS)
                .retryCount(0)
                .build();
        taskExecutionRepository.save(task);

        service.failTask(task.getId(), "fatal error", true);

        TaskExecution reloaded = taskExecutionRepository.findById(task.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR);
    }

    private static class InMemoryTaskExecutionRepository implements TaskExecutionRepository {
        private final Map<UUID, TaskExecution> store = new HashMap<>();

        @Override
        public TaskExecution save(TaskExecution taskExecution) {
            store.put(taskExecution.getId(), taskExecution);
            return taskExecution;
        }

        @Override
        public Optional<TaskExecution> findById(UUID id) {
            return Optional.ofNullable(store.get(id));
        }

        @Override
        public List<TaskExecution> findByWorkflowExecutionId(UUID workflowExecutionId) {
            return store.values().stream().filter(t -> t.getWorkflowExecutionId().equals(workflowExecutionId)).toList();
        }

        @Override
        public Optional<TaskExecution> findByWorkflowExecutionIdAndTaskReferenceName(UUID workflowExecutionId, String taskReferenceName) {
            return store.values().stream()
                    .filter(t -> t.getWorkflowExecutionId().equals(workflowExecutionId) && t.getTaskReferenceName().equals(taskReferenceName))
                    .findFirst();
        }

        @Override
        public List<TaskExecution> findByWorkflowExecutionIdAndStatus(UUID workflowExecutionId, TaskExecutionStatus status) {
            return store.values().stream()
                    .filter(t -> t.getWorkflowExecutionId().equals(workflowExecutionId) && t.getStatus() == status)
                    .toList();
        }
    }

    private static class InMemoryTaskDefinitionRepository implements TaskDefinitionRepository {
        private final Map<String, TaskDefinition> store = new HashMap<>();
        private final AtomicInteger idSeq = new AtomicInteger();

        @Override
        public TaskDefinition save(TaskDefinition taskDefinition) {
            TaskDefinition withId = new TaskDefinition(String.valueOf(idSeq.incrementAndGet()), taskDefinition.name(),
                    taskDefinition.description(), taskDefinition.retryCount(), taskDefinition.retryLogic(),
                    taskDefinition.retryDelaySeconds(), taskDefinition.timeoutSeconds(), taskDefinition.inputKeys(),
                    taskDefinition.outputKeys());
            store.put(withId.name(), withId);
            return withId;
        }

        @Override
        public Optional<TaskDefinition> findByName(String name) {
            return Optional.ofNullable(store.get(name));
        }
    }
}
