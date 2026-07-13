package media.reelforge.pulsar.core.queue;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

class InMemoryTaskQueueTest {

    private final InMemoryTaskQueue queue = new InMemoryTaskQueue();

    @Test
    void pollReturnsEmptyWhenQueueIsEmpty() {
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isEmpty();
    }

    @Test
    void pushThenPollReturnsTheTaskExecutionId() {
        queue.push("transcode-video", "task-1");
        Optional<String> polled = queue.poll("transcode-video", Duration.ofSeconds(30));
        assertThat(polled).contains("task-1");
    }

    @Test
    void pollRemovesTaskFromVisibleQueueUntilAcknowledgedOrLeaseExpires() {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofSeconds(30));
        assertThat(queue.peek("transcode-video", 10)).isEmpty();
    }

    @Test
    void acknowledgeRemovesTaskPermanently() {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofSeconds(30));
        queue.acknowledge("transcode-video", "task-1");

        // Even after time passes there is no lease left to expire and requeue.
        assertThat(queue.poll("transcode-video", Duration.ofMillis(1))).isEmpty();
    }

    @Test
    void expiredLeaseIsRequeuedOnNextPoll() throws InterruptedException {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofMillis(20));

        Thread.sleep(50);

        Optional<String> redelivered = queue.poll("transcode-video", Duration.ofSeconds(30));
        assertThat(redelivered).contains("task-1");
    }

    @Test
    void expiredLeaseIsRequeuedAndVisibleViaPeek() throws InterruptedException {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofMillis(20));

        Thread.sleep(50);

        assertThat(queue.peek("transcode-video", 10)).contains("task-1");
    }

    @Test
    void extendLeasePreventsRequeueBeforeExtendedExpiry() throws InterruptedException {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofMillis(50));
        queue.extendLease("transcode-video", "task-1", Duration.ofSeconds(30));

        Thread.sleep(80);

        // Original lease would have expired by now, but the extension should keep it held.
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isEmpty();
    }

    @Test
    void extendLeaseOnAlreadyAcknowledgedTaskIsANoop() {
        queue.push("transcode-video", "task-1");
        queue.poll("transcode-video", Duration.ofSeconds(30));
        queue.acknowledge("transcode-video", "task-1");

        queue.extendLease("transcode-video", "task-1", Duration.ofSeconds(30));
        assertThat(queue.peek("transcode-video", 10)).isEmpty();
    }

    @Test
    void peekReturnsUpToCountItemsWithoutRemovingThem() {
        queue.push("transcode-video", "task-1");
        queue.push("transcode-video", "task-2");
        queue.push("transcode-video", "task-3");

        List<String> peeked = queue.peek("transcode-video", 2);
        assertThat(peeked).hasSize(2);

        // peek must not consume — poll should still be able to drain all three.
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isPresent();
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isPresent();
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isPresent();
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).isEmpty();
    }

    @Test
    void differentTaskTypesAreIndependentQueues() {
        queue.push("transcode-video", "task-1");
        queue.push("generate-thumbnail", "task-2");

        assertThat(queue.poll("generate-thumbnail", Duration.ofSeconds(30))).contains("task-2");
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).contains("task-1");
    }

    @Test
    void fifoOrderingIsPreservedAcrossPolls() {
        queue.push("transcode-video", "task-1");
        queue.push("transcode-video", "task-2");

        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).contains("task-1");
        assertThat(queue.poll("transcode-video", Duration.ofSeconds(30))).contains("task-2");
    }
}
