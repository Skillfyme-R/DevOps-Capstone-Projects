package media.reelforge.pulsar.core.retry;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import media.reelforge.pulsar.core.model.RetryLogic;

class RetryPolicyTest {

    @Test
    void fixedRetryAlwaysReturnsBaseDelay() {
        RetryPolicy policy = new FixedRetryPolicy();
        assertThat(policy.nextDelaySeconds(1, 10)).isEqualTo(10);
        assertThat(policy.nextDelaySeconds(5, 10)).isEqualTo(10);
        assertThat(policy.nextDelaySeconds(100, 10)).isEqualTo(10);
    }

    @Test
    void linearRetryScalesWithAttemptNumber() {
        RetryPolicy policy = new LinearRetryPolicy();
        assertThat(policy.nextDelaySeconds(1, 5)).isEqualTo(5);
        assertThat(policy.nextDelaySeconds(2, 5)).isEqualTo(10);
        assertThat(policy.nextDelaySeconds(4, 5)).isEqualTo(20);
    }

    @Test
    void linearRetryTreatsNonPositiveAttemptAsFirstAttempt() {
        RetryPolicy policy = new LinearRetryPolicy();
        assertThat(policy.nextDelaySeconds(0, 5)).isEqualTo(5);
    }

    @Test
    void exponentialBackoffDoublesPerAttempt() {
        RetryPolicy policy = new ExponentialBackoffRetryPolicy();
        assertThat(policy.nextDelaySeconds(1, 2)).isEqualTo(2);
        assertThat(policy.nextDelaySeconds(2, 2)).isEqualTo(4);
        assertThat(policy.nextDelaySeconds(3, 2)).isEqualTo(8);
        assertThat(policy.nextDelaySeconds(4, 2)).isEqualTo(16);
    }

    @Test
    void exponentialBackoffCapsAtMaxDelay() {
        RetryPolicy policy = new ExponentialBackoffRetryPolicy();
        long delay = policy.nextDelaySeconds(30, 10);
        assertThat(delay).isEqualTo(3600L);
    }

    @Test
    void exponentialBackoffHandlesLargeAttemptCountsWithoutOverflow() {
        RetryPolicy policy = new ExponentialBackoffRetryPolicy();
        long delay = policy.nextDelaySeconds(1000, 1);
        assertThat(delay).isEqualTo(3600L);
    }

    @Test
    void factoryReturnsMatchingPolicyType() {
        assertThat(RetryPolicyFactory.forLogic(RetryLogic.FIXED)).isInstanceOf(FixedRetryPolicy.class);
        assertThat(RetryPolicyFactory.forLogic(RetryLogic.LINEAR_BACKOFF)).isInstanceOf(LinearRetryPolicy.class);
        assertThat(RetryPolicyFactory.forLogic(RetryLogic.EXPONENTIAL_BACKOFF)).isInstanceOf(ExponentialBackoffRetryPolicy.class);
    }
}
