package media.reelforge.pulsar.core.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.WorkflowStatus;

class WorkflowStateMachineTest {

    @Test
    void runningCanTransitionToPausedCompletedFailedTerminatedOrTimedOut() {
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.PAUSED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.COMPLETED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.FAILED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.TERMINATED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.TIMED_OUT)).isTrue();
    }

    @Test
    void pausedCanOnlyResumeOrTerminate() {
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.PAUSED, WorkflowStatus.RUNNING)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.PAUSED, WorkflowStatus.TERMINATED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.PAUSED, WorkflowStatus.COMPLETED)).isFalse();
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.PAUSED, WorkflowStatus.FAILED)).isFalse();
    }

    @Test
    void terminalWorkflowStatusesCannotTransitionAnywhere() {
        for (WorkflowStatus terminal : new WorkflowStatus[]{
                WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.TERMINATED, WorkflowStatus.TIMED_OUT}) {
            for (WorkflowStatus target : WorkflowStatus.values()) {
                assertThat(WorkflowStateMachine.canTransition(terminal, target))
                        .as("%s -> %s should be illegal", terminal, target)
                        .isFalse();
            }
        }
    }

    @Test
    void sameStatusTransitionIsNotAllowed() {
        assertThat(WorkflowStateMachine.canTransition(WorkflowStatus.RUNNING, WorkflowStatus.RUNNING)).isFalse();
    }

    @Test
    void assertValidTransitionThrowsPulsarExceptionWithIllegalStateCodeOnInvalidTransition() {
        assertThatThrownBy(() -> WorkflowStateMachine.assertValidTransition(WorkflowStatus.COMPLETED, WorkflowStatus.RUNNING))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> assertThat(((PulsarException) ex).getErrorCode()).isEqualTo(ErrorCodes.ILLEGAL_STATE_TRANSITION));
    }

    @Test
    void assertValidTransitionDoesNotThrowOnLegalTransition() {
        WorkflowStateMachine.assertValidTransition(WorkflowStatus.RUNNING, WorkflowStatus.COMPLETED);
    }

    @Test
    void taskScheduledCanMoveToInProgressCanceledSkippedOrTimedOut() {
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.SCHEDULED, TaskExecutionStatus.IN_PROGRESS)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.SCHEDULED, TaskExecutionStatus.CANCELED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.SCHEDULED, TaskExecutionStatus.SKIPPED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.SCHEDULED, TaskExecutionStatus.COMPLETED)).isFalse();
    }

    @Test
    void taskFailedCanBeRescheduledForRetryButNotCompletedDirectly() {
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.FAILED, TaskExecutionStatus.SCHEDULED)).isTrue();
        assertThat(WorkflowStateMachine.canTransition(TaskExecutionStatus.FAILED, TaskExecutionStatus.COMPLETED)).isFalse();
    }

    @Test
    void terminalTaskStatusesCannotTransitionAnywhere() {
        for (TaskExecutionStatus terminal : new TaskExecutionStatus[]{
                TaskExecutionStatus.COMPLETED, TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR,
                TaskExecutionStatus.CANCELED, TaskExecutionStatus.SKIPPED}) {
            for (TaskExecutionStatus target : TaskExecutionStatus.values()) {
                assertThat(WorkflowStateMachine.canTransition(terminal, target))
                        .as("%s -> %s should be illegal", terminal, target)
                        .isFalse();
            }
        }
    }

    @Test
    void assertValidTransitionThrowsForIllegalTaskTransition() {
        assertThatThrownBy(() -> WorkflowStateMachine.assertValidTransition(TaskExecutionStatus.COMPLETED, TaskExecutionStatus.IN_PROGRESS))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> assertThat(((PulsarException) ex).getErrorCode()).isEqualTo(ErrorCodes.ILLEGAL_STATE_TRANSITION));
    }
}
