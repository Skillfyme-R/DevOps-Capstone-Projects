package media.reelforge.pulsar.server.api.v1.dto;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(String errorCode, String message, Instant timestamp, String path, List<FieldError> fieldErrors) {

    public record FieldError(String field, String message) {
    }

    public static ErrorResponse of(String errorCode, String message, String path) {
        return new ErrorResponse(errorCode, message, Instant.now(), path, List.of());
    }

    public static ErrorResponse withFieldErrors(String errorCode, String message, String path, List<FieldError> fieldErrors) {
        return new ErrorResponse(errorCode, message, Instant.now(), path, fieldErrors);
    }
}
