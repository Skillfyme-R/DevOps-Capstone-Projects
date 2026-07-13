package media.reelforge.pulsar.server.persistence.mapper;

import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.server.persistence.entity.WorkflowExecutionEntity;

@Component
public class WorkflowExecutionMapper {

    private final ObjectMapper objectMapper;

    public WorkflowExecutionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WorkflowExecutionEntity toEntity(WorkflowExecution execution) {
        return WorkflowExecutionEntity.builder()
                .id(execution.getId())
                .workflowDefinitionId(execution.getWorkflowDefinitionId())
                .workflowDefinitionVersion(execution.getWorkflowDefinitionVersion())
                .status(execution.getStatus())
                .inputJson(writeMap(execution.getInput()))
                .outputJson(writeMap(execution.getOutput()))
                .startTime(execution.getStartTime())
                .endTime(execution.getEndTime())
                .correlationId(execution.getCorrelationId())
                .build();
    }

    public WorkflowExecution toModel(WorkflowExecutionEntity entity) {
        return WorkflowExecution.builder()
                .id(entity.getId())
                .workflowDefinitionId(entity.getWorkflowDefinitionId())
                .workflowDefinitionVersion(entity.getWorkflowDefinitionVersion())
                .status(entity.getStatus())
                .input(readMap(entity.getInputJson()))
                .output(readMap(entity.getOutputJson()))
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .correlationId(entity.getCorrelationId())
                .build();
    }

    private String writeMap(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map == null ? Map.of() : map);
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to serialize workflow execution data", e);
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
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to deserialize workflow execution data", e);
        }
    }
}
