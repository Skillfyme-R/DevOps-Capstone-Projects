package media.reelforge.pulsar.core.retry;

public final class FixedRetryPolicy implements RetryPolicy {

    @Override
    public long nextDelaySeconds(int attemptNumber, long baseDelaySeconds) {
        return baseDelaySeconds;
    }
}
