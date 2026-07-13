package media.reelforge.pulsar.core.retry;

/**
 * Doubles the delay per attempt (baseDelay * 2^(attempt-1)), capped so a runaway retry count
 * can't produce a delay that effectively never fires.
 */
public final class ExponentialBackoffRetryPolicy implements RetryPolicy {

    private static final long MAX_DELAY_SECONDS = 3600L;

    @Override
    public long nextDelaySeconds(int attemptNumber, long baseDelaySeconds) {
        int attempt = Math.max(attemptNumber, 1);
        // Cap the exponent itself, not just the result, to avoid overflow in the shift for large attempt counts.
        int cappedExponent = Math.min(attempt - 1, 62);
        long delay = baseDelaySeconds * (1L << cappedExponent);
        if (delay < 0 || delay > MAX_DELAY_SECONDS) {
            return MAX_DELAY_SECONDS;
        }
        return delay;
    }
}
