package media.reelforge.pulsar.core.queue;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Redis-agnostic queue port. poll() behaves like SQS visibility timeout: it removes the item
 * from the visible queue and leases it to the caller for leaseTime, after which it becomes
 * eligible for redelivery unless acknowledged or the lease is extended first.
 */
public interface TaskQueue {

    void push(String taskType, String taskExecutionId);

    Optional<String> poll(String taskType, Duration leaseTime);

    void acknowledge(String taskType, String taskExecutionId);

    void extendLease(String taskType, String taskExecutionId, Duration extension);

    List<String> peek(String taskType, int count);
}
