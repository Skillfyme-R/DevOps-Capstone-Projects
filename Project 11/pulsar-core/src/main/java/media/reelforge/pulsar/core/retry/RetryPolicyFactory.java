package media.reelforge.pulsar.core.retry;

import media.reelforge.pulsar.core.model.RetryLogic;

public final class RetryPolicyFactory {

    private static final RetryPolicy FIXED = new FixedRetryPolicy();
    private static final RetryPolicy LINEAR = new LinearRetryPolicy();
    private static final RetryPolicy EXPONENTIAL = new ExponentialBackoffRetryPolicy();

    private RetryPolicyFactory() {
    }

    public static RetryPolicy forLogic(RetryLogic retryLogic) {
        return switch (retryLogic) {
            case FIXED -> FIXED;
            case LINEAR_BACKOFF -> LINEAR;
            case EXPONENTIAL_BACKOFF -> EXPONENTIAL;
        };
    }
}
