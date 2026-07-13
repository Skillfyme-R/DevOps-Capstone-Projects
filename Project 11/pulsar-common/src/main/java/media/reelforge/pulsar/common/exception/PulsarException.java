package media.reelforge.pulsar.common.exception;

/**
 * Root of the Pulsar exception hierarchy. All domain-specific exceptions
 * thrown by the engine, server, or worker SDK extend this class so callers
 * can catch a single type at integration boundaries.
 */
public class PulsarException extends RuntimeException {

    private final String errorCode;

    public PulsarException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public PulsarException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
