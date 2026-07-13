package media.reelforge.pulsar.server.api.v1.dto;

import java.time.Instant;
import java.util.List;

import media.reelforge.pulsar.core.model.WorkflowDefinition;

public record WorkflowDefinitionResponse(
        String id,
        String name,
        int version,
        String description,
        List<TaskDefinitionRefDto> tasks,
        long timeoutSeconds,
        String ownerEmail,
        Instant createdAt
) {

    public static WorkflowDefinitionResponse fromModel(WorkflowDefinition definition) {
        return new WorkflowDefinitionResponse(
                definition.id(),
                definition.name(),
                definition.version(),
                definition.description(),
                definition.tasks().stream().map(TaskDefinitionRefDto::fromModel).toList(),
                definition.timeoutSeconds(),
                definition.ownerEmail(),
                definition.createdAt());
    }
}
