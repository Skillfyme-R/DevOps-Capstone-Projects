package media.reelforge.pulsar.server.api.v1.dto;

import jakarta.validation.constraints.NotBlank;

public record FailTaskRequest(@NotBlank String reason, boolean terminal) {
}
