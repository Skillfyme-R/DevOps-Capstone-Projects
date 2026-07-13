package media.reelforge.pulsar.workersdk.client;

import java.util.Map;
import java.util.UUID;

/** Client-side mirror of TaskExecutionResponse, trimmed to the fields a worker actually needs. */
public record PolledTask(
        UUID id,
        UUID workflowExecutionId,
        String taskReferenceName,
        String taskType,
        Map<String, Object> input,
        int retryCount
) {
}
