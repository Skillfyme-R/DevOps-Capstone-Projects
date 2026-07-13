package media.reelforge.pulsar.core.model;

import java.util.List;

/**
 * Describes a reusable SIMPLE task type (e.g. "transcode-video") that workers register
 * against — distinct from TaskDefinitionRef, which is a specific usage of a task type
 * within one workflow's DAG.
 */
public record TaskDefinition(
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

    public TaskDefinition {
        inputKeys = inputKeys == null ? List.of() : List.copyOf(inputKeys);
        outputKeys = outputKeys == null ? List.of() : List.copyOf(outputKeys);
    }
}
