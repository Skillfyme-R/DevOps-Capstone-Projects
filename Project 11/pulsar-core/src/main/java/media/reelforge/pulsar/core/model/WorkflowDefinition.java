package media.reelforge.pulsar.core.model;

import java.time.Instant;
import java.util.List;

/**
 * The JSON-authored blueprint of a workflow's DAG. Immutable — a running WorkflowExecution
 * always references a specific (id, version) pair, so edits to a definition never affect
 * in-flight executions.
 */
public record WorkflowDefinition(
        String id,
        String name,
        int version,
        String description,
        List<TaskDefinitionRef> tasks,
        long timeoutSeconds,
        String ownerEmail,
        Instant createdAt
) {

    public WorkflowDefinition {
        tasks = tasks == null ? List.of() : List.copyOf(tasks);
    }

    public TaskDefinitionRef findTask(String taskReferenceName) {
        return tasks.stream()
                .filter(t -> t.taskReferenceName().equals(taskReferenceName))
                .findFirst()
                .orElse(null);
    }

    public TaskDefinitionRef firstTask() {
        return tasks.isEmpty() ? null : tasks.get(0);
    }
}
