package media.reelforge.pulsar.core.retry;

public final class LinearRetryPolicy implements RetryPolicy {

    @Override
    public long nextDelaySeconds(int attemptNumber, long baseDelaySeconds) {
        int attempt = Math.max(attemptNumber, 1);
        return baseDelaySeconds * attempt;
    }
}
