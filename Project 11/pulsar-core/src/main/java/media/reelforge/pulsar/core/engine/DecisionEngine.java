package media.reelforge.pulsar.core.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;

/**
 * Computes what should happen next for a running workflow: which task refs are newly ready to
 * schedule, which are now unreachable, and whether the workflow itself has reached a terminal
 * state. Pure function of (definition, execution, task executions so far) — no I/O, no
 * persistence — the caller (pulsar-server) is responsible for actually creating/persisting the
 * resulting TaskExecutions and pushing SIMPLE tasks onto the queue.
 */
public final class DecisionEngine {

    // Statuses that let a JOIN branch or downstream successor be considered "satisfied" for graph-walk purposes.
    private static final Set<TaskExecutionStatus> SATISFIED = Set.of(
            TaskExecutionStatus.COMPLETED, TaskExecutionStatus.SKIPPED);

    public DecisionResult decide(WorkflowDefinition definition, WorkflowExecution execution, List<TaskExecution> executions) {
        Map<String, TaskDefinitionRef> byRef = new HashMap<>();
        definition.tasks().forEach(t -> byRef.put(t.taskReferenceName(), t));

        Map<String, TaskExecution> latestByRef = new HashMap<>();
        for (TaskExecution te : executions) {
            latestByRef.put(te.getTaskReferenceName(), te);
        }

        // Any terminal task failure fails the whole workflow immediately, regardless of sibling branches.
        boolean hasTerminalFailure = executions.stream()
                .anyMatch(te -> te.getStatus() == TaskExecutionStatus.FAILED_WITH_TERMINAL_ERROR);
        if (hasTerminalFailure) {
            return DecisionResult.terminal(WorkflowStatus.FAILED);
        }
        boolean hasExhaustedFailure = executions.stream()
                .anyMatch(te -> te.getStatus() == TaskExecutionStatus.FAILED);
        if (hasExhaustedFailure) {
            return DecisionResult.terminal(WorkflowStatus.FAILED);
        }

        boolean hasTerminateHit = executions.stream()
                .anyMatch(te -> te.getStatus() == TaskExecutionStatus.COMPLETED
                        && byRef.get(te.getTaskReferenceName()) != null
                        && byRef.get(te.getTaskReferenceName()).taskType() == TaskType.TERMINATE);
        if (hasTerminateHit) {
            return DecisionResult.terminal(resolveTerminateStatus(byRef, latestByRef));
        }

        List<TaskDefinitionRef> toSchedule = new ArrayList<>();
        List<TaskDefinitionRef> toSkip = new ArrayList<>();
        Set<String> alreadyDecided = new HashSet<>(latestByRef.keySet());

        if (executions.isEmpty()) {
            TaskDefinitionRef first = definition.firstTask();
            if (first != null) {
                collectInitialSchedule(first, byRef, toSchedule, toSkip, alreadyDecided);
            }
        } else {
            for (TaskExecution te : executions) {
                if (te.getStatus() != TaskExecutionStatus.COMPLETED) {
                    continue;
                }
                TaskDefinitionRef task = byRef.get(te.getTaskReferenceName());
                if (task == null) {
                    continue;
                }
                for (String successorRef : successorsOf(task, execution, te)) {
                    tryAdvance(successorRef, byRef, latestByRef, toSchedule, toSkip, alreadyDecided);
                }
            }
        }

        if (toSchedule.isEmpty() && toSkip.isEmpty() && isWorkflowComplete(byRef, latestByRef)) {
            return DecisionResult.terminal(WorkflowStatus.COMPLETED);
        }

        return DecisionResult.scheduling(toSchedule, toSkip);
    }

    /** Seeds scheduling from the first task, immediately fanning out through any leading FORK/DECISION chain. */
    private void collectInitialSchedule(TaskDefinitionRef task, Map<String, TaskDefinitionRef> byRef,
                                         List<TaskDefinitionRef> toSchedule, List<TaskDefinitionRef> toSkip,
                                         Set<String> alreadyDecided) {
        tryAdvance(task.taskReferenceName(), byRef, Map.of(), toSchedule, toSkip, alreadyDecided);
    }

    /**
     * Attempts to move a single task reference forward: schedule it if it's a schedulable node
     * whose prerequisites (for JOIN) are met, or recurse through it if it's a control-flow node
     * (FORK fans out immediately; DECISION resolves its branch immediately) that produces no
     * TaskExecution of its own.
     */
    private void tryAdvance(String ref, Map<String, TaskDefinitionRef> byRef, Map<String, TaskExecution> latestByRef,
                             List<TaskDefinitionRef> toSchedule, List<TaskDefinitionRef> toSkip, Set<String> alreadyDecided) {
        if (alreadyDecided.contains(ref)) {
            return;
        }
        TaskDefinitionRef task = byRef.get(ref);
        if (task == null) {
            return;
        }

        switch (task.taskType()) {
            case JOIN -> {
                if (allSatisfied(task.joinOn(), latestByRef)) {
                    alreadyDecided.add(ref);
                    toSchedule.add(task);
                } // else: stays pending, will be re-evaluated on the next branch completion
            }
            case FORK -> {
                alreadyDecided.add(ref);
                toSchedule.add(task);
                for (String branchStart : task.next()) {
                    tryAdvance(branchStart, byRef, latestByRef, toSchedule, toSkip, alreadyDecided);
                }
            }
            case DECISION -> {
                alreadyDecided.add(ref);
                toSchedule.add(task);
                List<String> chosenBranch = resolveDecisionBranch(task, latestByRef);
                for (String branchStart : chosenBranch) {
                    tryAdvance(branchStart, byRef, latestByRef, toSchedule, toSkip, alreadyDecided);
                }
                for (String otherRef : allBranchRefs(task)) {
                    if (!chosenBranch.contains(otherRef) && !alreadyDecided.contains(otherRef)) {
                        TaskDefinitionRef skipped = byRef.get(otherRef);
                        if (skipped != null) {
                            alreadyDecided.add(otherRef);
                            toSkip.add(skipped);
                        }
                    }
                }
            }
            default -> {
                alreadyDecided.add(ref);
                toSchedule.add(task);
            }
        }
    }

    private boolean allSatisfied(List<String> refs, Map<String, TaskExecution> latestByRef) {
        if (refs.isEmpty()) {
            return true;
        }
        return refs.stream().allMatch(r -> {
            TaskExecution te = latestByRef.get(r);
            return te != null && SATISFIED.contains(te.getStatus());
        });
    }

    /** Successor refs of a just-completed task: its declared `next`, plus any JOIN that might now be satisfied. */
    private List<String> successorsOf(TaskDefinitionRef task, WorkflowExecution execution, TaskExecution completed) {
        if (task.taskType() == TaskType.DECISION) {
            // DECISION successors were already resolved and scheduled at decision time; nothing further here.
            return List.of();
        }
        return task.next();
    }

    private List<String> resolveDecisionBranch(TaskDefinitionRef decisionTask, Map<String, TaskExecution> latestByRef) {
        Object value = decisionTask.inputParameters().get(decisionTask.decisionInputParameter());
        String key = value == null ? null : String.valueOf(value);
        List<String> branch = key == null ? null : decisionTask.decisionCases().get(key);
        if (branch == null || branch.isEmpty()) {
            branch = decisionTask.defaultCase();
        }
        return branch;
    }

    private List<String> allBranchRefs(TaskDefinitionRef decisionTask) {
        List<String> all = new ArrayList<>();
        decisionTask.decisionCases().values().forEach(all::addAll);
        all.addAll(decisionTask.defaultCase());
        return all;
    }

    private WorkflowStatus resolveTerminateStatus(Map<String, TaskDefinitionRef> byRef, Map<String, TaskExecution> latestByRef) {
        return latestByRef.values().stream()
                .filter(te -> te.getStatus() == TaskExecutionStatus.COMPLETED)
                .map(te -> byRef.get(te.getTaskReferenceName()))
                .filter(t -> t != null && t.taskType() == TaskType.TERMINATE)
                .findFirst()
                .map(t -> {
                    Object status = t.inputParameters().get("terminationStatus");
                    if (status == null) {
                        return WorkflowStatus.COMPLETED;
                    }
                    try {
                        return WorkflowStatus.valueOf(String.valueOf(status));
                    } catch (IllegalArgumentException e) {
                        return WorkflowStatus.COMPLETED;
                    }
                })
                .orElse(WorkflowStatus.COMPLETED);
    }

    /** True once every task reference in the definition has reached a satisfied/failed-handled terminal status. */
    private boolean isWorkflowComplete(Map<String, TaskDefinitionRef> byRef, Map<String, TaskExecution> latestByRef) {
        for (String ref : byRef.keySet()) {
            TaskExecution te = latestByRef.get(ref);
            if (te == null) {
                return false;
            }
            TaskExecutionStatus status = te.getStatus();
            boolean done = status == TaskExecutionStatus.COMPLETED
                    || status == TaskExecutionStatus.SKIPPED
                    || status == TaskExecutionStatus.CANCELED;
            if (!done) {
                return false;
            }
        }
        return true;
    }
}
