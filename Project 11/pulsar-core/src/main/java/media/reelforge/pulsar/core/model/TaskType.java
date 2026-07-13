package media.reelforge.pulsar.core.model;

/**
 * SIMPLE is the only type polled by external workers; the rest are control-flow
 * tasks evaluated in-process by the decider engine and never hit the task queue.
 */
public enum TaskType {
    SIMPLE,
    FORK,
    JOIN,
    DECISION,
    SUB_WORKFLOW,
    DYNAMIC,
    TERMINATE
}
