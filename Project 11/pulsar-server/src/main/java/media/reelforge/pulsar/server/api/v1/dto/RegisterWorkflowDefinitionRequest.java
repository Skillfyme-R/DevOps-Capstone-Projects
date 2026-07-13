package media.reelforge.pulsar.server.api.v1.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record RegisterWorkflowDefinitionRequest(
        @NotBlank String name,
        @Min(1) int version,
        String description,
        @NotEmpty @Valid List<TaskDefinitionRefDto> tasks,
        @Min(0) long timeoutSeconds,
        String ownerEmail
) {
}
