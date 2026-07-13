package media.reelforge.pulsar.server.persistence.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.server.persistence.entity.WorkflowDefinitionEntity;

@Component
public class WorkflowDefinitionMapper {

    private final ObjectMapper objectMapper;

    public WorkflowDefinitionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WorkflowDefinitionEntity toEntity(WorkflowDefinition definition) {
        return WorkflowDefinitionEntity.builder()
                .id(definition.id() == null ? null : UUID.fromString(definition.id()))
                .name(definition.name())
                .version(definition.version())
                .description(definition.description())
                .tasksJson(writeTasks(definition.tasks()))
                .timeoutSeconds(definition.timeoutSeconds())
                .ownerEmail(definition.ownerEmail())
                .createdAt(definition.createdAt() == null ? Instant.now() : definition.createdAt())
                .build();
    }

    public WorkflowDefinition toModel(WorkflowDefinitionEntity entity) {
        return new WorkflowDefinition(
                entity.getId().toString(),
                entity.getName(),
                entity.getVersion(),
                entity.getDescription(),
                readTasks(entity.getTasksJson()),
                entity.getTimeoutSeconds(),
                entity.getOwnerEmail(),
                entity.getCreatedAt());
    }

    private String writeTasks(List<TaskDefinitionRef> tasks) {
        try {
            return objectMapper.writeValueAsString(tasks);
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to serialize workflow tasks", e);
        }
    }

    private List<TaskDefinitionRef> readTasks(String json) {
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, TaskDefinitionRef.class));
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to deserialize workflow tasks", e);
        }
    }
}
