package media.reelforge.pulsar.server.api.v1.dto;

import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import media.reelforge.pulsar.core.model.RetryLogic;

public record RegisterTaskDefinitionRequest(
        @NotBlank String name,
        String description,
        @Min(0) int retryCount,
        @NotNull RetryLogic retryLogic,
        @Min(0) long retryDelaySeconds,
        @Min(0) long timeoutSeconds,
        List<String> inputKeys,
        List<String> outputKeys
) {
}
