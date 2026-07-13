package media.reelforge.pulsar.core.retry;

public interface RetryPolicy {

    long nextDelaySeconds(int attemptNumber, long baseDelaySeconds);
}
