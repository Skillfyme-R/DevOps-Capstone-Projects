package media.reelforge.pulsar.server.api.v1.dto;

import jakarta.validation.constraints.Min;

public record ExtendLeaseRequest(@Min(1) long extensionSeconds) {
}
