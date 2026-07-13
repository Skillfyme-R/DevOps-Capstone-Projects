package media.reelforge.pulsar.server.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.micrometer.core.instrument.MeterRegistry;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.engine.DecisionEngine;
import media.reelforge.pulsar.core.engine.DecisionResult;
import media.reelforge.pulsar.core.engine.SubWorkflowStarter;
import media.reelforge.pulsar.core.engine.WorkflowStateMachine;
import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;
import media.reelforge.pulsar.core.queue.TaskQueue;
import media.reelforge.pulsar.core.repository.TaskExecutionRepository;
import media.reelforge.pulsar.core.repository.WorkflowDefinitionRepository;
import media.reelforge.pulsar.core.repository.WorkflowExecutionRepository;

/**
 * Ties DecisionEngine + repositories + TaskQueue together. This is the crux of the engine:
 * progressWorkflow() loops decide() -> persist -> auto-complete control-flow tasks -> decide()
 * again, because DecisionEngine.decide() only resolves one "wave" of the graph per call (a JOIN's
 * successors, for instance, aren't known until the JOIN itself is marked COMPLETED and decide()
 * is invoked once more — see DecisionEngine.tryAdvance: FORK/DECISION branches are folded into the
 * same wave as their parent, but JOIN is only added to toSchedule once its joinOn set is already
 * satisfied, and its own successors need a further decide() call after JOIN completes).
 *
 * Design note: WorkflowExecution.workflowDefinitionId (an opaque String on the core model) is set
 * to the workflow's *name* rather than a synthetic id, because WorkflowDefinitionRepository's port
 * only exposes name-keyed lookups (findByNameAndVersion / findLatestByName) — there is no
 * findById. Using the name directly lets progressWorkflow(UUID) resolve the owning definition
 * without adding an id-lookup method to the pulsar-core port that nothing else needs.
 */
@Service
public class WorkflowExecutionService {

    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final TaskExecutionRepository taskExecutionRepository;
    private final TaskQueue taskQueue;
    private final DecisionEngine decisionEngine;
    private final MeterRegistry meterRegistry;

    private final SubWorkflowStarter subWorkflowStarter;

    public WorkflowExecutionService(WorkflowDefinitionRepository workflowDefinitionRepository,
                                     WorkflowExecutionRepository workflowExecutionRepository,
                                     TaskExecutionRepository taskExecutionRepository,
                                     TaskQueue taskQueue,
                                     DecisionEngine decisionEngine,
                                     MeterRegistry meterRegistry) {
        this.workflowDefinitionRepository = workflowDefinitionRepository;
        this.workflowExecutionRepository = workflowExecutionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.taskQueue = taskQueue;
        this.decisionEngine = decisionEngine;
        this.meterRegistry = meterRegistry;
        // Fire-and-forget: a SUB_WORKFLOW task starts the child and completes itself immediately once
        // the child exists, rather than blocking on the child's terminal status (documented trade-off,
        // simplest correct choice per the phase-2 brief — full wait-for-child semantics are out of scope).
        this.subWorkflowStarter = (ref, input) ->
                startWorkflow(ref.subWorkflowName(), ref.subWorkflowVersion() > 0 ? ref.subWorkflowVersion() : null, input, null);
    }

    @Transactional
    public UUID startWorkflow(String workflowName, Integer version, Map<String, Object> input, String correlationId) {
        WorkflowDefinition definition = version == null
                ? workflowDefinitionRepository.findLatestByName(workflowName)
                        .orElseThrow(() -> notFound(workflowName))
                : workflowDefinitionRepository.findByNameAndVersion(workflowName, version)
                        .orElseThrow(() -> notFound(workflowName, version));

        WorkflowExecution execution = WorkflowExecution.builder()
                .workflowDefinitionId(definition.name())
                .workflowDefinitionVersion(definition.version())
                .status(WorkflowStatus.RUNNING)
                .input(input)
                .startTime(Instant.now())
                .correlationId(correlationId)
                .build();
        execution = workflowExecutionRepository.save(execution);
        meterRegistry.counter("pulsar.workflow.started").increment();

        progressWorkflow(definition, execution);
        return execution.getId();
    }

    private PulsarException notFound(String name) {
        return new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND, "No workflow definition found for name '" + name + "'");
    }

    private PulsarException notFound(String name, int version) {
        return new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                "No workflow definition found for name '" + name + "' version " + version);
    }

    /** Re-loads the definition + all task executions for a workflow and drives decide() forward. Called after every task completion/failure. */
    @Transactional
    public void progressWorkflow(UUID workflowExecutionId) {
        WorkflowExecution execution = getExecution(workflowExecutionId);
        if (execution.getStatus() != WorkflowStatus.RUNNING) {
            return; // paused/terminal workflows don't get advanced by task completions
        }
        WorkflowDefinition definition = workflowDefinitionRepository
                .findByNameAndVersion(execution.getWorkflowDefinitionId(), execution.getWorkflowDefinitionVersion())
                .orElseThrow(() -> new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                        "Workflow definition '" + execution.getWorkflowDefinitionId() + "' v" + execution.getWorkflowDefinitionVersion() + " not found"));
        progressWorkflow(definition, execution);
    }

    private void progressWorkflow(WorkflowDefinition definition, WorkflowExecution execution) {
        boolean cascade = true;
        while (cascade) {
            cascade = false;
            List<TaskExecution> executions = taskExecutionRepository.findByWorkflowExecutionId(execution.getId());
            DecisionResult result = decisionEngine.decide(definition, execution, executions);

            if (result.isTerminal()) {
                completeWorkflow(execution, result.terminalStatus());
                return;
            }

            for (TaskDefinitionRef skipped : result.tasksToSkip()) {
                taskExecutionRepository.save(TaskExecution.builder()
                        .workflowExecutionId(execution.getId())
                        .taskReferenceName(skipped.taskReferenceName())
                        .taskType(skipped.taskType())
                        .status(TaskExecutionStatus.SKIPPED)
                        .scheduledTime(Instant.now())
                        .build());
            }

            for (TaskDefinitionRef toSchedule : result.tasksToSchedule()) {
                TaskExecution scheduled = taskExecutionRepository.save(TaskExecution.builder()
                        .workflowExecutionId(execution.getId())
                        .taskReferenceName(toSchedule.taskReferenceName())
                        .taskType(toSchedule.taskType())
                        .status(TaskExecutionStatus.SCHEDULED)
                        .input(toSchedule.inputParameters())
                        .scheduledTime(Instant.now())
                        .build());

                if (isWorkerPolled(toSchedule.taskType())) {
                    taskQueue.push(queueTopic(toSchedule), scheduled.getId().toString());
                } else {
                    // FORK/JOIN/DECISION/TERMINATE do no external work; SUB_WORKFLOW is fire-and-forget
                    // (starts the child, doesn't wait for it) — both auto-complete synchronously here,
                    // which is why we loop (cascade = true) instead of waiting for an external poll/complete call.
                    if (toSchedule.taskType() == TaskType.SUB_WORKFLOW) {
                        subWorkflowStarter.startSubWorkflow(toSchedule, scheduled.getInput());
                    }
                    scheduled.setStatus(TaskExecutionStatus.IN_PROGRESS);
                    scheduled.setStartTime(Instant.now());
                    scheduled.setStatus(TaskExecutionStatus.COMPLETED);
                    scheduled.setEndTime(Instant.now());
                    scheduled.setOutput(Map.of());
                    taskExecutionRepository.save(scheduled);
                    cascade = true;
                }
            }
        }
    }

    private boolean isWorkerPolled(TaskType taskType) {
        return taskType == TaskType.SIMPLE || taskType == TaskType.DYNAMIC;
    }

    /**
     * The queue topic a worker polls on is the DAG node's taskReferenceName, not the reusable
     * TaskDefinition.name — TaskExecution only persists taskReferenceName (not TaskDefinitionRef.name),
     * so using taskReferenceName end-to-end (push here, poll/ack/fail in TaskExecutionService) keeps the
     * topic derivable purely from a TaskExecution row without needing a side lookup. Each workflow step
     * effectively gets its own queue lane; a worker interested in a given task type polls by that lane's name.
     */
    static String queueTopic(TaskDefinitionRef ref) {
        return ref.taskReferenceName();
    }

    private void completeWorkflow(WorkflowExecution execution, WorkflowStatus terminalStatus) {
        WorkflowStateMachine.assertValidTransition(execution.getStatus(), terminalStatus);
        execution.setStatus(terminalStatus);
        execution.setEndTime(Instant.now());
        workflowExecutionRepository.save(execution);
        if (terminalStatus == WorkflowStatus.COMPLETED) {
            meterRegistry.counter("pulsar.workflow.completed").increment();
        }
    }

    public WorkflowExecution getExecution(UUID id) {
        return workflowExecutionRepository.findById(id)
                .orElseThrow(() -> new PulsarException(ErrorCodes.WORKFLOW_EXECUTION_NOT_FOUND,
                        "No workflow execution found for id " + id));
    }

    public List<TaskExecution> getTaskExecutions(UUID workflowExecutionId) {
        return taskExecutionRepository.findByWorkflowExecutionId(workflowExecutionId);
    }

    @Transactional
    public void pause(UUID id) {
        WorkflowExecution execution = getExecution(id);
        WorkflowStateMachine.assertValidTransition(execution.getStatus(), WorkflowStatus.PAUSED);
        execution.setStatus(WorkflowStatus.PAUSED);
        workflowExecutionRepository.save(execution);
    }

    @Transactional
    public void resume(UUID id) {
        WorkflowExecution execution = getExecution(id);
        WorkflowStateMachine.assertValidTransition(execution.getStatus(), WorkflowStatus.RUNNING);
        execution.setStatus(WorkflowStatus.RUNNING);
        workflowExecutionRepository.save(execution);
        progressWorkflow(id);
    }

    @Transactional
    public void terminate(UUID id) {
        WorkflowExecution execution = getExecution(id);
        WorkflowStateMachine.assertValidTransition(execution.getStatus(), WorkflowStatus.TERMINATED);
        execution.setStatus(WorkflowStatus.TERMINATED);
        execution.setEndTime(Instant.now());
        workflowExecutionRepository.save(execution);
    }

    /** Re-runs decide() for a FAILED workflow after rescheduling its failed/timed-out tasks — useful for recovering without restarting from scratch. */
    @Transactional
    public void retry(UUID id) {
        WorkflowExecution execution = getExecution(id);
        if (execution.getStatus() == WorkflowStatus.FAILED) {
            WorkflowStateMachine.assertValidTransition(WorkflowStatus.FAILED, WorkflowStatus.RUNNING);
        }
        List<TaskExecution> executions = taskExecutionRepository.findByWorkflowExecutionId(id);
        boolean anyRescheduled = false;
        for (TaskExecution te : executions) {
            if (te.getStatus() == TaskExecutionStatus.FAILED || te.getStatus() == TaskExecutionStatus.TIMED_OUT) {
                WorkflowStateMachine.assertValidTransition(te.getStatus(), TaskExecutionStatus.SCHEDULED);
                te.setStatus(TaskExecutionStatus.SCHEDULED);
                te.setRetryCount(te.getRetryCount() + 1);
                taskExecutionRepository.save(te);
                taskQueue.push(te.getTaskReferenceName(), te.getId().toString());
                anyRescheduled = true;
            }
        }
        if (execution.getStatus() == WorkflowStatus.FAILED && anyRescheduled) {
            execution.setStatus(WorkflowStatus.RUNNING);
            execution.setEndTime(null);
            workflowExecutionRepository.save(execution);
        }
    }

    /** Rerun-from-scratch: fresh WorkflowExecution against the same definition version + original input. */
    @Transactional
    public UUID rerun(UUID id) {
        WorkflowExecution original = getExecution(id);
        return startWorkflow(original.getWorkflowDefinitionId(), original.getWorkflowDefinitionVersion(),
                original.getInput(), original.getCorrelationId());
    }
}
