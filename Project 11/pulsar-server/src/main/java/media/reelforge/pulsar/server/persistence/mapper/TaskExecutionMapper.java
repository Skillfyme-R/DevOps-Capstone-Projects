package media.reelforge.pulsar.server.persistence.mapper;

import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.server.persistence.entity.TaskExecutionEntity;

@Component
public class TaskExecutionMapper {

    private final ObjectMapper objectMapper;

    public TaskExecutionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public TaskExecutionEntity toEntity(TaskExecution execution) {
        return TaskExecutionEntity.builder()
                .id(execution.getId())
                .workflowExecutionId(execution.getWorkflowExecutionId())
                .taskReferenceName(execution.getTaskReferenceName())
                .taskType(execution.getTaskType())
                .status(execution.getStatus())
                .inputJson(writeMap(execution.getInput()))
                .outputJson(writeMap(execution.getOutput()))
                .retryCount(execution.getRetryCount())
                .scheduledTime(execution.getScheduledTime())
                .startTime(execution.getStartTime())
                .endTime(execution.getEndTime())
                .workerId(execution.getWorkerId())
                .callbackAfterSeconds(execution.getCallbackAfterSeconds())
                .build();
    }

    public TaskExecution toModel(TaskExecutionEntity entity) {
        return TaskExecution.builder()
                .id(entity.getId())
                .workflowExecutionId(entity.getWorkflowExecutionId())
                .taskReferenceName(entity.getTaskReferenceName())
                .taskType(entity.getTaskType())
                .status(entity.getStatus())
                .input(readMap(entity.getInputJson()))
                .output(readMap(entity.getOutputJson()))
                .retryCount(entity.getRetryCount())
                .scheduledTime(entity.getScheduledTime())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .workerId(entity.getWorkerId())
                .callbackAfterSeconds(entity.getCallbackAfterSeconds())
                .build();
    }

    private String writeMap(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map == null ? Map.of() : map);
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to serialize task execution data", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readMap(String json) {
        if (json == null) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to deserialize task execution data", e);
        }
    }
}
