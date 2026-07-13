package media.reelforge.pulsar.core.model;

public enum RetryLogic {
    FIXED,
    EXPONENTIAL_BACKOFF,
    LINEAR_BACKOFF
}
