package media.reelforge.pulsar.server.api.v1.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;

public record StartWorkflowRequest(
        @NotBlank String workflowName,
        Integer version,
        Map<String, Object> input,
        String correlationId
) {
}
