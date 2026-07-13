package media.reelforge.pulsar.core.engine;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;

/** Validates a WorkflowDefinition's DAG at registration time, before it can ever be executed. */
public final class WorkflowGraphValidator {

    public void validate(WorkflowDefinition definition) {
        List<TaskDefinitionRef> tasks = definition.tasks();
        if (tasks.isEmpty()) {
            throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                    "Workflow '" + definition.name() + "' has no tasks");
        }

        Map<String, TaskDefinitionRef> byRef = new HashMap<>();
        for (TaskDefinitionRef task : tasks) {
            if (byRef.putIfAbsent(task.taskReferenceName(), task) != null) {
                throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                        "Duplicate task reference name: " + task.taskReferenceName());
            }
        }

        checkDanglingReferences(byRef);
        checkForkJoinPairing(byRef);
        checkCycles(byRef);
    }

    private void checkDanglingReferences(Map<String, TaskDefinitionRef> byRef) {
        for (TaskDefinitionRef task : byRef.values()) {
            for (String ref : outgoingEdges(task)) {
                if (!byRef.containsKey(ref)) {
                    throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                            "Task '" + task.taskReferenceName() + "' references non-existent task '" + ref + "'");
                }
            }
            if (task.taskType() == TaskType.JOIN) {
                for (String ref : task.joinOn()) {
                    if (!byRef.containsKey(ref)) {
                        throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                                "JOIN task '" + task.taskReferenceName() + "' waits on non-existent task '" + ref + "'");
                    }
                }
            }
        }
    }

    /** Every FORK must be followed, somewhere downstream, by a JOIN that declares joinOn covering its branches. */
    private void checkForkJoinPairing(Map<String, TaskDefinitionRef> byRef) {
        for (TaskDefinitionRef task : byRef.values()) {
            if (task.taskType() != TaskType.FORK) {
                continue;
            }
            if (task.next().isEmpty()) {
                throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                        "FORK task '" + task.taskReferenceName() + "' has no parallel branches");
            }
            boolean hasMatchingJoin = byRef.values().stream()
                    .anyMatch(candidate -> candidate.taskType() == TaskType.JOIN
                            && new HashSet<>(candidate.joinOn()).containsAll(task.next()));
            if (!hasMatchingJoin) {
                throw new PulsarException(ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                        "FORK task '" + task.taskReferenceName() + "' has no matching JOIN covering all its branches");
            }
        }
    }

    private void checkCycles(Map<String, TaskDefinitionRef> byRef) {
        Set<String> visited = new HashSet<>();
        Set<String> inStack = new HashSet<>();
        for (String ref : byRef.keySet()) {
            if (!visited.contains(ref)) {
                detectCycleDfs(ref, byRef, visited, inStack, new ArrayDeque<>());
            }
        }
    }

    private void detectCycleDfs(String ref, Map<String, TaskDefinitionRef> byRef, Set<String> visited,
                                 Set<String> inStack, Deque<String> path) {
        visited.add(ref);
        inStack.add(ref);
        path.push(ref);

        TaskDefinitionRef task = byRef.get(ref);
        for (String next : outgoingEdges(task)) {
            if (inStack.contains(next)) {
                List<String> cycle = new ArrayList<>(path);
                java.util.Collections.reverse(cycle);
                throw new PulsarException(ErrorCodes.CYCLIC_WORKFLOW_GRAPH,
                        "Cycle detected in workflow graph: " + String.join(" -> ", cycle) + " -> " + next);
            }
            if (!visited.contains(next)) {
                detectCycleDfs(next, byRef, visited, inStack, path);
            }
        }

        path.pop();
        inStack.remove(ref);
    }

    private List<String> outgoingEdges(TaskDefinitionRef task) {
        if (task.taskType() == TaskType.DECISION) {
            List<String> edges = new ArrayList<>(task.next());
            task.decisionCases().values().forEach(edges::addAll);
            edges.addAll(task.defaultCase());
            return edges;
        }
        return task.next();
    }
}
