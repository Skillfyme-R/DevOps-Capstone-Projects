package media.reelforge.pulsar.server.api.v1.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;

public record WorkflowExecutionResponse(
        UUID id,
        String workflowDefinitionId,
        int workflowDefinitionVersion,
        WorkflowStatus status,
        Map<String, Object> input,
        Map<String, Object> output,
        Instant startTime,
        Instant endTime,
        String correlationId,
        List<TaskExecutionResponse> tasks
) {

    public static WorkflowExecutionResponse fromModel(WorkflowExecution execution, List<TaskExecutionResponse> tasks) {
        return new WorkflowExecutionResponse(
                execution.getId(),
                execution.getWorkflowDefinitionId(),
                execution.getWorkflowDefinitionVersion(),
                execution.getStatus(),
                execution.getInput(),
                execution.getOutput(),
                execution.getStartTime(),
                execution.getEndTime(),
                execution.getCorrelationId(),
                tasks);
    }
}
