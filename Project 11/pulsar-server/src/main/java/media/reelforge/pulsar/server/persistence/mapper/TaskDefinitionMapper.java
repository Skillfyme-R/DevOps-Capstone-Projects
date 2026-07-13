package media.reelforge.pulsar.server.persistence.mapper;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.server.persistence.entity.TaskDefinitionEntity;

@Component
public class TaskDefinitionMapper {

    public TaskDefinitionEntity toEntity(TaskDefinition definition) {
        return TaskDefinitionEntity.builder()
                .id(definition.id() == null ? null : UUID.fromString(definition.id()))
                .name(definition.name())
                .description(definition.description())
                .retryCount(definition.retryCount())
                .retryLogic(definition.retryLogic())
                .retryDelaySeconds(definition.retryDelaySeconds())
                .timeoutSeconds(definition.timeoutSeconds())
                .inputKeys(String.join(",", definition.inputKeys()))
                .outputKeys(String.join(",", definition.outputKeys()))
                .build();
    }

    public TaskDefinition toModel(TaskDefinitionEntity entity) {
        return new TaskDefinition(
                entity.getId().toString(),
                entity.getName(),
                entity.getDescription(),
                entity.getRetryCount(),
                entity.getRetryLogic(),
                entity.getRetryDelaySeconds(),
                entity.getTimeoutSeconds(),
                splitOrEmpty(entity.getInputKeys()),
                splitOrEmpty(entity.getOutputKeys()));
    }

    private List<String> splitOrEmpty(String csv) {
        if (!StringUtils.hasText(csv)) {
            return List.of();
        }
        return Arrays.asList(csv.split(","));
    }
}
