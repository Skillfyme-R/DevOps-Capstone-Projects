package media.reelforge.pulsar.core.engine;

import java.util.List;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.WorkflowStatus;

/**
 * Output of one DecisionEngine.decide() call: the task refs newly ready to schedule, the task
 * refs that are now unreachable and should be marked SKIPPED (e.g. the untaken branch of a
 * DECISION), and — when non-null — the workflow status the caller should transition to because
 * the run has reached a terminal condition.
 */
public record DecisionResult(
        List<TaskDefinitionRef> tasksToSchedule,
        List<TaskDefinitionRef> tasksToSkip,
        WorkflowStatus terminalStatus
) {

    public static DecisionResult scheduling(List<TaskDefinitionRef> tasksToSchedule, List<TaskDefinitionRef> tasksToSkip) {
        return new DecisionResult(List.copyOf(tasksToSchedule), List.copyOf(tasksToSkip), null);
    }

    public static DecisionResult terminal(WorkflowStatus status) {
        return new DecisionResult(List.of(), List.of(), status);
    }

    public boolean isTerminal() {
        return terminalStatus != null;
    }
}
