package media.reelforge.pulsar.core.model;

public enum TaskExecutionStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    FAILED_WITH_TERMINAL_ERROR,
    TIMED_OUT,
    CANCELED,
    SKIPPED
}
