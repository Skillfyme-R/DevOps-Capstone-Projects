package media.reelforge.pulsar.server.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.micrometer.core.instrument.MeterRegistry;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.engine.WorkflowStateMachine;
import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.queue.TaskQueue;
import media.reelforge.pulsar.core.repository.TaskDefinitionRepository;
import media.reelforge.pulsar.core.repository.TaskExecutionRepository;
import media.reelforge.pulsar.core.retry.RetryPolicy;
import media.reelforge.pulsar.core.retry.RetryPolicyFactory;

/**
 * Implements the poll/ack/complete lifecycle workers call over HTTP (worker SDK is a later phase;
 * this is the server-side contract it will call against). completeTask/failTask both re-invoke
 * WorkflowExecutionService.progressWorkflow() afterward — that's how a single task completion
 * cascades into scheduling the workflow's next wave of work.
 */
@Service
public class TaskExecutionService {

    private static final Duration DEFAULT_LEASE = Duration.ofSeconds(60);

    private final TaskExecutionRepository taskExecutionRepository;
    private final TaskDefinitionRepository taskDefinitionRepository;
    private final TaskQueue taskQueue;
    private final WorkflowExecutionService workflowExecutionService;
    private final MeterRegistry meterRegistry;

    public TaskExecutionService(TaskExecutionRepository taskExecutionRepository,
                                 TaskDefinitionRepository taskDefinitionRepository,
                                 TaskQueue taskQueue,
                                 WorkflowExecutionService workflowExecutionService,
                                 MeterRegistry meterRegistry) {
        this.taskExecutionRepository = taskExecutionRepository;
        this.taskDefinitionRepository = taskDefinitionRepository;
        this.taskQueue = taskQueue;
        this.workflowExecutionService = workflowExecutionService;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public Optional<TaskExecution> pollTask(String taskType, String workerId) {
        Optional<String> taskExecutionId = taskQueue.poll(taskType, DEFAULT_LEASE);
        if (taskExecutionId.isEmpty()) {
            return Optional.empty();
        }
        meterRegistry.counter("pulsar.task.polled").increment();
        UUID id = UUID.fromString(taskExecutionId.get());
        TaskExecution task = taskExecutionRepository.findById(id)
                .orElseThrow(() -> new PulsarException(ErrorCodes.TASK_EXECUTION_NOT_FOUND, "No task execution found for id " + id));
        WorkflowStateMachine.assertValidTransition(task.getStatus(), TaskExecutionStatus.IN_PROGRESS);
        task.setStatus(TaskExecutionStatus.IN_PROGRESS);
        task.setWorkerId(workerId);
        task.setStartTime(Instant.now());
        task.setCallbackAfterSeconds(DEFAULT_LEASE.getSeconds());
        return Optional.of(taskExecutionRepository.save(task));
    }

    @Transactional
    public void completeTask(UUID taskExecutionId, Map<String, Object> output) {
        TaskExecution task = getTask(taskExecutionId);
        WorkflowStateMachine.assertValidTransition(task.getStatus(), TaskExecutionStatus.COMPLETED);
        task.setStatus(TaskExecutionStatus.COMPLETED);
        task.setOutput(output == null ? Map.of() : output);
        task.setEndTime(Instant.now());
        taskExecutionRepository.save(task);
        taskQueue.acknowledge(queueTopic(task), task.getId().toString());
        workflowExecutionService.progressWorkflow(task.getWorkflowExecutionId());
    }

    /**
     * FAILED goes terminal immediately if the caller says so or no retries remain (per the task
     * definition's retryCount/retryLogic/retryDelaySeconds); otherwise it's rescheduled: the queue
     * item is acked (so it's not redelivered by lease expiry too) and pushed again as a fresh
     * SCHEDULED task after RetryPolicy's computed delay has elapsed (delay is encoded into
     * scheduledTime; this phase re-pushes immediately rather than holding a timer, since the
     * TaskQueue port has no delayed-delivery primitive — acceptable for a portfolio-scope engine).
     * Retry policy is looked up by taskReferenceName against the registered TaskDefinition table —
     * this only resolves when a workflow author names a SIMPLE task's taskReferenceName to match a
     * registered TaskDefinition.name (a reasonable, if implicit, convention at this phase's scope).
     * If no matching TaskDefinition is registered, the task is treated as non-retryable.
     */
    @Transactional
    public void failTask(UUID taskExecutionId, String reason, boolean terminal) {
        TaskExecution task = getTask(taskExecutionId);
        taskQueue.acknowledge(queueTopic(task), task.getId().toString());

        Optional<TaskDefinition> definitionOpt = taskDefinitionRepository.findByName(task.getTaskReferenceName());

        boolean retriesExhausted = definitionOpt.isEmpty() || task.getRetryCount() >= definitionOpt.get().retryCount();

        if (terminal || retriesExhausted) {
            WorkflowStateMachine.assertValidTransition(task.getStatus(), TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR);
            task.setStatus(TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR);
            task.setEndTime(Instant.now());
            task.setOutput(Map.of("error", reason));
            taskExecutionRepository.save(task);
            workflowExecutionService.progressWorkflow(task.getWorkflowExecutionId());
            return;
        }

        TaskDefinition definition = definitionOpt.get();
        RetryPolicy retryPolicy = RetryPolicyFactory.forLogic(definition.retryLogic());
        long delaySeconds = retryPolicy.nextDelaySeconds(task.getRetryCount() + 1, definition.retryDelaySeconds());

        WorkflowStateMachine.assertValidTransition(task.getStatus(), TaskExecutionStatus.FAILED);
        task.setStatus(TaskExecutionStatus.FAILED);
        task.setEndTime(Instant.now());
        task.setOutput(Map.of("error", reason));
        taskExecutionRepository.save(task);

        WorkflowStateMachine.assertValidTransition(TaskExecutionStatus.FAILED, TaskExecutionStatus.SCHEDULED);
        task.setStatus(TaskExecutionStatus.SCHEDULED);
        task.setRetryCount(task.getRetryCount() + 1);
        task.setScheduledTime(Instant.now().plusSeconds(delaySeconds));
        taskExecutionRepository.save(task);
        taskQueue.push(queueTopic(task), task.getId().toString());
    }

    @Transactional
    public void extendLease(UUID taskExecutionId, Duration extension) {
        TaskExecution task = getTask(taskExecutionId);
        if (task.getStatus() != TaskExecutionStatus.IN_PROGRESS) {
            throw new PulsarException(ErrorCodes.ILLEGAL_STATE_TRANSITION, "Cannot extend lease for task not IN_PROGRESS: " + task.getStatus());
        }
        taskQueue.extendLease(queueTopic(task), task.getId().toString(), extension);
        task.setCallbackAfterSeconds(task.getCallbackAfterSeconds() + extension.getSeconds());
        taskExecutionRepository.save(task);
    }

    public TaskExecution getTask(UUID id) {
        return taskExecutionRepository.findById(id)
                .orElseThrow(() -> new PulsarException(ErrorCodes.TASK_EXECUTION_NOT_FOUND, "No task execution found for id " + id));
    }

    /** Mirrors WorkflowExecutionService.queueTopic: the queue topic is the DAG node's taskReferenceName. */
    private String queueTopic(TaskExecution task) {
        return task.getTaskReferenceName();
    }
}
