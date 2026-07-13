package media.reelforge.pulsar.core.engine;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.WorkflowStatus;

/**
 * Kept free of Spring/JPA so pulsar-server can depend on pulsar-core as a pure algorithm
 * library without pulling a web framework transitively into what is really a state-transition
 * table plus graph walk.
 */
public final class WorkflowStateMachine {

    private static final Map<WorkflowStatus, Set<WorkflowStatus>> WORKFLOW_TRANSITIONS = new EnumMap<>(WorkflowStatus.class);
    private static final Map<TaskExecutionStatus, Set<TaskExecutionStatus>> TASK_TRANSITIONS = new EnumMap<>(TaskExecutionStatus.class);

    static {
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.RUNNING, EnumSet.of(
                WorkflowStatus.PAUSED, WorkflowStatus.COMPLETED, WorkflowStatus.FAILED,
                WorkflowStatus.TERMINATED, WorkflowStatus.TIMED_OUT));
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.PAUSED, EnumSet.of(
                WorkflowStatus.RUNNING, WorkflowStatus.TERMINATED));
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.COMPLETED, EnumSet.noneOf(WorkflowStatus.class));
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.FAILED, EnumSet.noneOf(WorkflowStatus.class));
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.TERMINATED, EnumSet.noneOf(WorkflowStatus.class));
        WORKFLOW_TRANSITIONS.put(WorkflowStatus.TIMED_OUT, EnumSet.noneOf(WorkflowStatus.class));

        TASK_TRANSITIONS.put(TaskExecutionStatus.SCHEDULED, EnumSet.of(
                TaskExecutionStatus.IN_PROGRESS, TaskExecutionStatus.CANCELED,
                TaskExecutionStatus.SKIPPED, TaskExecutionStatus.TIMED_OUT));
        TASK_TRANSITIONS.put(TaskExecutionStatus.IN_PROGRESS, EnumSet.of(
                TaskExecutionStatus.COMPLETED, TaskExecutionStatus.FAILED,
                TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR, TaskExecutionStatus.TIMED_OUT,
                TaskExecutionStatus.CANCELED));
        // A retryable FAILED task is rescheduled by the engine, so FAILED -> SCHEDULED is legal.
        TASK_TRANSITIONS.put(TaskExecutionStatus.FAILED, EnumSet.of(TaskExecutionStatus.SCHEDULED));
        TASK_TRANSITIONS.put(TaskExecutionStatus.COMPLETED, EnumSet.noneOf(TaskExecutionStatus.class));
        TASK_TRANSITIONS.put(TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR, EnumSet.noneOf(TaskExecutionStatus.class));
        TASK_TRANSITIONS.put(TaskExecutionStatus.TIMED_OUT, EnumSet.of(TaskExecutionStatus.SCHEDULED));
        TASK_TRANSITIONS.put(TaskExecutionStatus.CANCELED, EnumSet.noneOf(TaskExecutionStatus.class));
        TASK_TRANSITIONS.put(TaskExecutionStatus.SKIPPED, EnumSet.noneOf(TaskExecutionStatus.class));
    }

    private WorkflowStateMachine() {
    }

    public static boolean canTransition(WorkflowStatus from, WorkflowStatus to) {
        if (from == to) {
            return false;
        }
        return WORKFLOW_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    public static void assertValidTransition(WorkflowStatus from, WorkflowStatus to) {
        if (!canTransition(from, to)) {
            throw new PulsarException(ErrorCodes.ILLEGAL_STATE_TRANSITION,
                    "Illegal workflow status transition: " + from + " -> " + to);
        }
    }

    public static boolean canTransition(TaskExecutionStatus from, TaskExecutionStatus to) {
        if (from == to) {
            return false;
        }
        return TASK_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    public static void assertValidTransition(TaskExecutionStatus from, TaskExecutionStatus to) {
        if (!canTransition(from, to)) {
            throw new PulsarException(ErrorCodes.ILLEGAL_STATE_TRANSITION,
                    "Illegal task execution status transition: " + from + " -> " + to);
        }
    }
}
