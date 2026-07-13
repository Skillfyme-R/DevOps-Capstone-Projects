package media.reelforge.pulsar.server.api.v1.dto;

import java.util.List;

import media.reelforge.pulsar.core.model.RetryLogic;
import media.reelforge.pulsar.core.model.TaskDefinition;

public record TaskDefinitionResponse(
        String id,
        String name,
        String description,
        int retryCount,
        RetryLogic retryLogic,
        long retryDelaySeconds,
        long timeoutSeconds,
        List<String> inputKeys,
        List<String> outputKeys
) {

    public static TaskDefinitionResponse fromModel(TaskDefinition definition) {
        return new TaskDefinitionResponse(definition.id(), definition.name(), definition.description(),
                definition.retryCount(), definition.retryLogic(), definition.retryDelaySeconds(),
                definition.timeoutSeconds(), definition.inputKeys(), definition.outputKeys());
    }
}
