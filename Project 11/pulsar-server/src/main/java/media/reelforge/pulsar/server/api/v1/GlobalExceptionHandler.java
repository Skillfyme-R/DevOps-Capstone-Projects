package media.reelforge.pulsar.server.api.v1;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.server.api.v1.dto.ErrorResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PulsarException.class)
    public ResponseEntity<ErrorResponse> handlePulsarException(PulsarException ex, WebRequest request) {
        HttpStatus status = statusFor(ex.getErrorCode());
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(ex.getErrorCode(), ex.getMessage(), path(request)));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.withFieldErrors(ErrorCodes.VALIDATION_FAILED, "Request validation failed", path(request), fieldErrors));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(ErrorCodes.AUTHENTICATION_FAILED, "Invalid credentials", path(request)));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(ErrorCodes.AUTHORIZATION_DENIED, "Access denied", path(request)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred", path(request)));
    }

    private String path(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }

    private HttpStatus statusFor(String errorCode) {
        return switch (errorCode) {
            case ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                 ErrorCodes.TASK_DEFINITION_NOT_FOUND,
                 ErrorCodes.WORKFLOW_EXECUTION_NOT_FOUND,
                 ErrorCodes.TASK_EXECUTION_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ErrorCodes.DUPLICATE_WORKFLOW_DEFINITION,
                 ErrorCodes.ILLEGAL_STATE_TRANSITION -> HttpStatus.CONFLICT;
            case ErrorCodes.INVALID_WORKFLOW_DEFINITION,
                 ErrorCodes.CYCLIC_WORKFLOW_GRAPH,
                 ErrorCodes.VALIDATION_FAILED -> HttpStatus.BAD_REQUEST;
            case ErrorCodes.AUTHENTICATION_FAILED,
                 ErrorCodes.INVALID_API_KEY,
                 ErrorCodes.TOKEN_EXPIRED -> HttpStatus.UNAUTHORIZED;
            case ErrorCodes.AUTHORIZATION_DENIED -> HttpStatus.FORBIDDEN;
            case ErrorCodes.TASK_QUEUE_EMPTY -> HttpStatus.NO_CONTENT;
            case ErrorCodes.TASK_LEASE_EXPIRED -> HttpStatus.CONFLICT;
            case ErrorCodes.RATE_LIMIT_EXCEEDED -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
