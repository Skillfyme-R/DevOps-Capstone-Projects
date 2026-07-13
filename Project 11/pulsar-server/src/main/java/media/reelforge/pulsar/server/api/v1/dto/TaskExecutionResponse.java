package media.reelforge.pulsar.server.api.v1.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;

public record TaskExecutionResponse(
        UUID id,
        UUID workflowExecutionId,
        String taskReferenceName,
        TaskType taskType,
        TaskExecutionStatus status,
        Map<String, Object> input,
        Map<String, Object> output,
        int retryCount,
        Instant scheduledTime,
        Instant startTime,
        Instant endTime,
        String workerId,
        long callbackAfterSeconds
) {

    public static TaskExecutionResponse fromModel(TaskExecution execution) {
        return new TaskExecutionResponse(
                execution.getId(),
                execution.getWorkflowExecutionId(),
                execution.getTaskReferenceName(),
                execution.getTaskType(),
                execution.getStatus(),
                execution.getInput(),
                execution.getOutput(),
                execution.getRetryCount(),
                execution.getScheduledTime(),
                execution.getStartTime(),
                execution.getEndTime(),
                execution.getWorkerId(),
                execution.getCallbackAfterSeconds());
    }
}
