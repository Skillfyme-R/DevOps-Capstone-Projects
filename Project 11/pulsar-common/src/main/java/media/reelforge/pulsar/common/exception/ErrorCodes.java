package media.reelforge.pulsar.common.exception;

/**
 * Canonical error codes surfaced in API error responses and log entries.
 * Kept as string constants (not an enum) so new codes can be added by any
 * module without a compile-time dependency on pulsar-common's enum values.
 */
public final class ErrorCodes {

    private ErrorCodes() {
    }

    public static final String WORKFLOW_DEFINITION_NOT_FOUND = "PULSAR-1001";
    public static final String TASK_DEFINITION_NOT_FOUND = "PULSAR-1002";
    public static final String WORKFLOW_EXECUTION_NOT_FOUND = "PULSAR-1003";
    public static final String TASK_EXECUTION_NOT_FOUND = "PULSAR-1004";
    public static final String INVALID_WORKFLOW_DEFINITION = "PULSAR-1005";
    public static final String DUPLICATE_WORKFLOW_DEFINITION = "PULSAR-1006";
    public static final String ILLEGAL_STATE_TRANSITION = "PULSAR-1007";
    public static final String TASK_QUEUE_EMPTY = "PULSAR-1008";
    public static final String TASK_LEASE_EXPIRED = "PULSAR-1009";
    public static final String CYCLIC_WORKFLOW_GRAPH = "PULSAR-1010";

    public static final String AUTHENTICATION_FAILED = "PULSAR-2001";
    public static final String AUTHORIZATION_DENIED = "PULSAR-2002";
    public static final String INVALID_API_KEY = "PULSAR-2003";
    public static final String TOKEN_EXPIRED = "PULSAR-2004";

    public static final String VALIDATION_FAILED = "PULSAR-3001";
    public static final String RATE_LIMIT_EXCEEDED = "PULSAR-3002";
    public static final String INTERNAL_ERROR = "PULSAR-5000";
}
